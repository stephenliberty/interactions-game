import { Injectable } from '@nestjs/common';
import { Database } from 'sqlite';
import { FEATURES, PROPS } from '../providers/game-engine-db';
import { GameService } from '../game/game.service';
import { PlayerService } from '../player/player.service';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

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

  async createNewGameState(gameId: string) {}
  async getGameState(gameId: string) {}
}
