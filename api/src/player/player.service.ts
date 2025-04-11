import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConditionalCheckFailedException,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import {
  GetPlayerGameDto,
  PLAYER_STATES,
  PlayerDto,
  UpdatePlayerGameDto,
} from './player.dto';
import { GAME_STATES } from '../game/game.dto';
import { GameService } from '../game/game.service';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class PlayerService {
  private ddbDocClient: DynamoDBDocumentClient;
  constructor(
    private readonly dynamoDbClient: DynamoDBClient,
    private readonly gameService: GameService,
  ) {
    this.ddbDocClient = DynamoDBDocumentClient.from(this.dynamoDbClient);
  }

  /*
  Business logic time. We want to validate that each user has had the opportunity to setup their
  'props' and such, as well as make sure we know how they're feeling about the various other people playing.
   */
  async validateGameUsers(game_id: string) {
    const playerDtos = await this.getGamePlayers(game_id);
    if (playerDtos.length < 2) {
      throw new Error('Not enough players - must have at least two to play');
    }
    await Promise.all(
      playerDtos.map((player) => {
        return validate(player);
      }),
    );

    if (
      playerDtos.some((player) => {
        return (
          Object.keys(player.player_intensity).length !== playerDtos.length - 1
        );
      })
    ) {
      throw new Error('Not all players have other player intensities set');
    }
  }

  async getGamePlayer(
    game_id: string,
    userId: string,
  ): Promise<GetPlayerGameDto> {
    const gamePlayer = await this.ddbDocClient.send(
      new GetCommand({
        TableName: 'game_user',
        Key: {
          game_id: game_id,
          user_id: userId,
        },
      }),
    );
    if (!gamePlayer.Item) {
      throw new NotFoundException();
    }
    return plainToClass(GetPlayerGameDto, {
      user_id: gamePlayer.Item.user_id,
      game_id: gamePlayer.Item.game_id,
      display_name: gamePlayer.Item.display_name,
      props: gamePlayer.Item.props,
      state: gamePlayer.Item.state,
      points: gamePlayer.Item.points,
      features: gamePlayer.Item.features,
      player_intensity: gamePlayer.Item.player_intensity,
    });
  }

  async getGamePlayers(game_id: string): Promise<Array<PlayerDto>> {
    //TODO: Pagination
    const gamePlayers = await this.ddbDocClient.send(
      new QueryCommand({
        TableName: 'game_user',
        KeyConditionExpression: 'game_id = :game_id',
        ExpressionAttributeValues: {
          ':game_id': game_id,
        },
      }),
    );
    return gamePlayers.Items.map((gp) => {
      return plainToClass(PlayerDto, gp);
    });
  }

  async userIsPartOfGame(game_id: string, user_id: string): Promise<boolean> {
    const item = await this.ddbDocClient.send(
      new GetCommand({
        TableName: 'game_user',
        Key: {
          game_id: game_id,
          user_id: user_id,
        },
      }),
    );
    return !!item.Item;
  }

  async updateUser(
    game_id: string,
    user_id: string,
    properties: UpdatePlayerGameDto,
  ) {
    const expAttValues = new Map<string, any>();
    const updateExpression = [];

    if (properties.player_intensity) {
      expAttValues.set('player_intensity', properties.player_intensity);
      updateExpression.push('#player_intensity = :player_intensity');
    }

    if (properties.state) {
      expAttValues.set('state', properties.state);
      updateExpression.push('#state = :state');
    }

    if (properties.intensity) {
      expAttValues.set('intensity', properties.intensity);
      updateExpression.push('#intensity = :intensity');
    }

    if (properties.features) {
      expAttValues.set('features', properties.features);
      updateExpression.push('#features = :features');
    }

    if (properties.props) {
      expAttValues.set('props', properties.props);
      updateExpression.push('#props = :props');
    }

    if (properties.display_name) {
      expAttValues.set('display_name', properties.display_name);
      updateExpression.push('#display_name = :display_name');
    }

    await this.ddbDocClient.send(
      new UpdateCommand({
        TableName: 'game_user',
        Key: {
          game_id: game_id,
          user_id: user_id,
        },
        ConditionExpression:
          'attribute_exists(user_id) and attribute_exists(game_id)',
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
  }

  async joinUserToGame(game_id: string, user_id: string) {
    const game = await this.gameService.getGameById(game_id);
    if (game.state != GAME_STATES.CREATED) {
      throw new ConflictException('Cannot add users to active game');
    }
    try {
      await this.ddbDocClient.send(
        new UpdateCommand({
          TableName: 'game_user',
          Key: {
            game_id: game_id,
            user_id: user_id,
          },
          ExpressionAttributeNames: {
            '#points': 'points',
          },
          ExpressionAttributeValues: {
            ':points': 0,
          },
          ConditionExpression: 'attribute_not_exists(user_id)',
          UpdateExpression: 'SET #points = :points',
        }),
      );
    } catch (e) {
      if (e instanceof ConditionalCheckFailedException) {
        throw new ConflictException();
      }
      throw e;
    }
    await this.updateUser(game_id, user_id, {
      state: PLAYER_STATES.JOINED,
    });
  }
}
