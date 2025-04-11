import { Injectable, NotFoundException } from '@nestjs/common';
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
import { GetGameDto } from '../game/game.dto';

@Injectable()
export class GameEngineService {
  private ddbDocClient: DynamoDBDocumentClient;
  constructor(
    private readonly db: Database,
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
    private readonly dynamoDbClient: DynamoDBClient,
  ) {
    this.ddbDocClient = DynamoDBDocumentClient.from(this.dynamoDbClient);
  }

  async getPropsData() {
    return await this.db.all<PROPS[]>('select * from props');
  }
  async getFeaturesData() {
    return await this.db.all<FEATURES[]>('select * from features');
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
    });
  }
}
