import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ConditionalCheckFailedException,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  CreateGameDto,
  GAME_STATES,
  GetGameDto,
  UpdateGameDto,
} from './game.dto';
import { plainToClass } from 'class-transformer';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

@Injectable()
export class GameService {
  private ddbDocClient: DynamoDBDocumentClient;
  constructor(private readonly dynamoDbClient: DynamoDBClient) {
    this.ddbDocClient = DynamoDBDocumentClient.from(this.dynamoDbClient);
  }

  async getGameById(id: string): Promise<GetGameDto> {
    const item = await this.ddbDocClient.send(
      new GetCommand({
        TableName: 'game',
        Key: {
          id: id,
        },
      }),
    );
    if (!item.Item) {
      throw new NotFoundException();
    }
    return plainToClass(GetGameDto, {
      id: item.Item.id,
      virtualOnly: item.Item.virtualOnly,
      props: item.Item.props,
      maxIntensity: item.Item.maxIntensity,
      owner: item.Item.owner,
      state: item.Item.state,
    });
  }

  async getGamePassword(id: string): Promise<string> {
    const item = await this.ddbDocClient.send(
      new GetCommand({
        TableName: 'game',
        Key: {
          id: id,
        },
      }),
    );
    if (!item.Item) {
      throw new NotFoundException();
    }
    return item.Item.password;
  }

  async createNewGame(gameOwner: string) {
    const id = uuidv4();
    await this.dynamoDbClient.send(
      new PutCommand({
        TableName: 'game',
        Item: {
          id: id,
          owner: gameOwner,
          password: '' + Math.floor(Math.random() * 1000),
          state: GAME_STATES.CREATED,
          currentIntensity: 0,
          maxIntensity: 0,
        },
        ConditionExpression: 'attribute_not_exists(id)',
      }),
    );

    return plainToClass(CreateGameDto, {
      id: id,
    });
  }

  async updateGame(id: string, update: UpdateGameDto): Promise<GetGameDto> {
    const game = await this.getGameById(id);
    if (game.state != GAME_STATES.CREATED) {
      throw new ConflictException('Cannot update a running game');
    }

    const expAttValues = new Map<string, any>();
    const updateExpression = [];
    if (update.virtualOnly !== undefined) {
      expAttValues.set('virtualOnly', update.virtualOnly);
      updateExpression.push(
        '#virtualOnly = if_not_exists(#virtualOnly, :virtualOnly)',
      );
    }
    if (update.maxIntensity !== undefined) {
      expAttValues.set('maxIntensity', update.maxIntensity);
      updateExpression.push('#maxIntensity = :maxIntensity');
    }

    if (update.props !== undefined) {
      expAttValues.set('props', update.props);
      updateExpression.push('#props = :props');
    }

    if (expAttValues.size == 0) {
      return await this.getGameById(id);
    }
    try {
      await this.ddbDocClient.send(
        new UpdateCommand({
          TableName: 'game',
          Key: {
            id: id,
          },
          ConditionExpression: 'attribute_exists(id)',
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

    return await this.getGameById(id);
  }

  async changeGameState(id: string, newState: GAME_STATES) {
    //TODO: Validate state can change to target
    //      ex: are all players ready? are we going from started to created?
    await this.ddbDocClient.send(
      new UpdateCommand({
        TableName: 'game',
        Key: {
          id: id,
        },
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':state': newState,
        },
        UpdateExpression: 'SET #state = :state',
      }),
    );
  }
}
