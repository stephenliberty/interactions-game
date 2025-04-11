import {
  ConflictException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { GameService } from '../game/game.service';
import { GameEngineService } from './game-engine.service';
import { IdentityService } from '../identity/identity.service';
import { Request } from 'express';
import { GAME_STATES } from '../game/game.dto';
import { PlayerService } from '../player/player.service';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
@Controller({
  version: '1',
  path: 'game-engine',
})
export class GameEngineController {
  constructor(
    private readonly gameService: GameService,
    private readonly gameEngineService: GameEngineService,
    private readonly playerService: PlayerService,
  ) {}

  @Get('props')
  async getPropsData() {
    return this.gameEngineService.getPropsData();
  }

  @Get('features')
  async getFeaturesData() {
    return this.gameEngineService.getFeaturesData();
  }

  @Get(':game_id/state')
  async getGameState(
    @Param('game_id') gameId: string,
    @Req() request: Request,
  ) {
    if (
      !(await this.playerService.userIsPartOfGame(
        gameId,
        request.session.user_id,
      ))
    ) {
      throw new UnauthorizedException();
    }

    return this.gameEngineService.getGameState(gameId);
  }

  @Post(':game_id/start')
  async startGame(@Param('game_id') gameId: string, @Req() request: Request) {
    const game = await this.gameService.getGameById(gameId);
    if (game.owner != request.session.user_id) {
      throw new UnauthorizedException();
    }
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

    const newState = await this.gameEngineService.createNewGameState(gameId);

    await this.gameService.changeGameState(gameId, GAME_STATES.ACTIVE);

    return newState;
  }
}
