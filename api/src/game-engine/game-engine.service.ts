import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Database } from 'sqlite';
import { FEATURES, PROPS } from '../providers/game-engine-db';
import { GameService } from '../game/game.service';
import { PlayerService } from '../player/player.service';
import {
  ConditionalCheckFailedException,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { GetGameplayDto, UpdateGameplayStateDto } from './game-engine.dto';
import { plainToClass } from 'class-transformer';
import { GAME_STATES } from '../game/game.dto';
import { GAMEPLAY_REACTION, PLAYER_STATES } from '../player/player.dto';
import { Eta } from 'eta';

@Injectable()
export class GameEngineService {
  private ddbDocClient: DynamoDBDocumentClient;
  private eta: Eta;
  constructor(
    private readonly db: Database,
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
    private readonly dynamoDbClient: DynamoDBClient,
  ) {
    this.ddbDocClient = DynamoDBDocumentClient.from(this.dynamoDbClient);
    this.eta = new Eta();
  }

  async getPropsData() {
    return await this.db.all<PROPS[]>('select * from props');
  }
  async getFeaturesData() {
    return await this.db.all<FEATURES[]>('select * from features');
  }

  async startGame(gameId) {
    await this.gameService.changeGameState(gameId, GAME_STATES.VALIDATING);
    //TODO: Catch problems
    try {
      await this.playerService.validateGameUsers(gameId);
    } catch (e) {
      await this.gameService.changeGameState(gameId, GAME_STATES.CREATED);
      throw new ConflictException(
        'Not all players are ready and in a valid state',
      );
    }

    const players = await this.playerService.getGamePlayers(gameId);
    const activePlayer =
      players[Math.round(Math.random() * (players.length - 1))].user_id;
    await this.updateGameplayState(gameId, {
      activePlayer: activePlayer,
      points: players.reduce((acc, p) => {
        acc.set(p.user_id, 0);
        return acc;
      }, new Map()),
    });
    await Promise.all(
      players.map((p) => {
        return this.playerService.updateUser(gameId, p.user_id, {
          state: PLAYER_STATES.PLAYING,
        });
      }),
    );

    await this.gameService.changeGameState(gameId, GAME_STATES.ACTIVE);
    const interaction = await this.createInteractionForPlayer(
      gameId,
      activePlayer,
    );
    await this.updateGameplayState(gameId, {
      activeInteraction: interaction,
    });
    return await this.getGameplayState(gameId);
  }

  async updateGameplayState(
    gameId: string,
    stateUpdates: UpdateGameplayStateDto,
  ) {
    const expAttValues = new Map<string, any>();
    const updateExpression = [];
    if (stateUpdates.activePlayer !== undefined) {
      expAttValues.set('activePlayer', stateUpdates.activePlayer);
      updateExpression.push(
        '#activePlayer = if_not_exists(#activePlayer, :activePlayer)',
      );
    }
    if (stateUpdates.points !== undefined) {
      expAttValues.set('points', stateUpdates.points);
      updateExpression.push('#points = if_not_exists(#points, :points)');
    }

    if (stateUpdates.activeInteraction !== undefined) {
      expAttValues.set('activeInteraction', stateUpdates.activeInteraction);
      updateExpression.push(
        '#activeInteraction = if_not_exists(#activeInteraction, :activeInteraction)',
      );
    }

    try {
      await this.ddbDocClient.send(
        new UpdateCommand({
          TableName: 'game_state',
          Key: {
            game_id: gameId,
          },
          ExpressionAttributeNames: [...expAttValues.keys()].reduce(
            (accumulator, currentValue) => {
              accumulator['#' + currentValue] = currentValue;
              return accumulator;
            },
            {},
          ),
          ExpressionAttributeValues: [...expAttValues.entries()].reduce(
            (accumulator, currentValue) => {
              accumulator[':' + currentValue[0]] = currentValue[1];
              return accumulator;
            },
            {},
          ),
          UpdateExpression: 'SET ' + updateExpression.join(', '),
        }),
      );
    } catch (e) {
      if (e instanceof ConditionalCheckFailedException) {
        throw new NotFoundException();
      }
      throw e;
    }
  }
  async addPoints(gameId: string, userId: string, points: number) {
    await this.ddbDocClient.send(
      new UpdateCommand({
        TableName: 'game_state',
        Key: {
          game_id: gameId,
        },
        ExpressionAttributeNames: {
          '#player_id': userId,
        },
        ExpressionAttributeValues: {
          ':points': points,
        },
        UpdateExpression: 'SET points.#player_id = points.#player_id + :points',
      }),
    );
  }
  async getGameplayState(gameId: string) {
    const item = await this.ddbDocClient.send(
      new GetCommand({
        TableName: 'game_state',
        Key: {
          game_id: gameId,
        },
      }),
    );
    if (!item.Item) {
      throw new NotFoundException();
    }
    return plainToClass(GetGameplayDto, {
      gameId: item.Item.game_id,
      activePlayer: item.Item.activePlayer,
      points: new Map(Object.entries(item.Item.points)),
      activeInteraction: item.Item.activeInteraction,
    });
  }

  async createInteractionForPlayer(gameId, playerId) {
    /*
    We're going to start simple here - we're just going to gen a new interaction. Much like
    pulling a card from the top of a deck and putting it down for all to see
     */

    let thisPlayer;
    const otherPlayers = (
      await this.playerService.getGamePlayers(gameId)
    ).filter((p) => {
      //I know, this is kind of a hack
      if (p.user_id == playerId) {
        thisPlayer = p;
      }
      return p.user_id != playerId;
    });
    const targetPlayer =
      otherPlayers[Math.round(Math.random() * (otherPlayers.length - 1))];

    const game = await this.gameService.getGameById(gameId);

    const maxIntensity = Math.min(
      thisPlayer.intensity,
      targetPlayer.player_intensity[playerId],
      thisPlayer.player_intensity[targetPlayer.user_id],
      game.maxIntensity,
    );

    const interaction = await this.db.get(
      `
      SELECT *, interactions.id as iid FROM interactions
      WHERE
          intensity <= $intensity
          ${targetPlayer.player_vicinity[playerId] == 0 ? 'AND virtual = 1' : ''}
          AND (
            (SELECT count(*) FROM interactions_prop WHERE interaction_id=iid AND player_side = 'from' AND id NOT IN (SELECT value FROM json_each($targetProps))) == 0
            AND
            (SELECT count(*) FROM interactions_prop WHERE interaction_id=iid AND player_side = 'to' AND id NOT IN (SELECT value FROM json_each($fromProps))) == 0
          )
          AND (
            (SELECT count(*) FROM interactions_feature WHERE interaction_id=iid AND player_side = 'from' AND  id NOT IN (SELECT value FROM json_each($targetFeatures))) == 0
            AND
            (SELECT count(*) FROM interactions_feature WHERE interaction_id=iid AND player_side = 'to' AND  id NOT IN (SELECT value FROM json_each($fromFeatures))) == 0
          )
      order by RANDOM() LIMIT 1
      `,
      {
        $intensity: maxIntensity,
        $targetProps: JSON.stringify(targetPlayer.props || []),
        $fromProps: JSON.stringify(thisPlayer.props || []),
        $targetFeatures: JSON.stringify(targetPlayer.features || []),
        $fromFeatures: JSON.stringify(thisPlayer.features || []),
      },
    );

    return {
      interactionText: this.eta.renderString(interaction.description, {
        fromPlayer: thisPlayer.display_name,
        toPlayer: targetPlayer.display_name,
      }),
      interactionId: interaction.id,
      fromPlayer: thisPlayer.user_id,
      toPlayer: targetPlayer.user_id,
      intensity: interaction.intensity,
    };
  }

  async reactToInteraction(reactionType: GAMEPLAY_REACTION, gameId: string) {
    const game = await this.getGameplayState(gameId);
    if (reactionType == GAMEPLAY_REACTION.COMPLETE) {
      await this.addPoints(
        gameId,
        game.activeInteraction.toPlayer,
        1 + game.activeInteraction.intensity,
      );
    }
    const players = await this.playerService.getGamePlayers(gameId);
    let nextPlayerIndex =
      players.findIndex((p) => {
        return p.user_id == game.activePlayer;
      }) + 1;
    if (nextPlayerIndex >= players.length) {
      nextPlayerIndex = 0;
    }

    await this.updateGameplayState(gameId, {
      activePlayer: players[nextPlayerIndex].user_id,
      activeInteraction: await this.createInteractionForPlayer(
        gameId,
        players[nextPlayerIndex].user_id,
      ),
    });
  }
}
