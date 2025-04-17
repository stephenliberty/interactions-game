import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameController } from './game/game.controller';
import { GameService } from './game/game.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { IdentityService } from './identity/identity.service';
import { connectionProvider } from './providers/game-engine-db';
import { GameEngineService } from './game-engine/game-engine.service';
import { PlayerService } from './player/player.service';
import { GameEngineController } from './game-engine/game-engine.controller';
import { PlayerController } from './player/player.controller';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [
    AppController,
    GameController,
    GameEngineController,
    PlayerController,
  ],
  providers: [
    AppService,
    GameService,
    GameEngineService,
    PlayerService,
    IdentityService,
    connectionProvider,
    {
      provide: DynamoDBClient,
      useFactory: (configService: ConfigService) => {
        return new DynamoDBClient({
          endpoint: configService.get<string>('DYNAMODB_ENDPOINT_URL'),
          region: configService.get<string>('AWS_REGION'),
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
