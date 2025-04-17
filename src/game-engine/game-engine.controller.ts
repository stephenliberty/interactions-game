import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { GameService } from '../game/game.service';
import { GameEngineService } from './game-engine.service';
import { Request } from 'express';
import { PlayerService } from '../player/player.service';
import { GamePlayerGuard } from '../player/game-player.guard';
import { GAMEPLAY_REACTION } from '../player/player.dto';

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

  @UseGuards(GamePlayerGuard)
  @Get(':game_id/state')
  async getGameState(@Param('game_id') gameId: string) {
    return this.gameEngineService.getGameplayState(gameId);
  }

  @Post(':game_id/start')
  async startGame(@Param('game_id') gameId: string, @Req() request: Request) {
    const game = await this.gameService.getGameById(gameId);
    if (game.owner != request.session.user_id) {
      throw new UnauthorizedException();
    }
    return await this.gameEngineService.startGame(gameId);
  }

  @UseGuards(GamePlayerGuard)
  @Post(':game_id/react')
  async reactToInteraction(
    @Param('game_id') gameId: string,
    @Req() request: Request,
    @Body() reaction: { reactionType: GAMEPLAY_REACTION },
  ) {
    const gameState = await this.gameEngineService.getGameplayState(gameId);
    if (
      reaction.reactionType == GAMEPLAY_REACTION.COMPLETE &&
      request.session.user_id != gameState.activeInteraction.fromPlayer
    ) {
      throw new UnauthorizedException();
    }
    if (
      reaction.reactionType == GAMEPLAY_REACTION.PASS &&
      request.session.user_id != gameState.activeInteraction.toPlayer
    ) {
      throw new UnauthorizedException();
    }
    if (
      reaction.reactionType != GAMEPLAY_REACTION.PASS &&
      reaction.reactionType != GAMEPLAY_REACTION.COMPLETE
    ) {
      throw new UnauthorizedException();
    }
    return await this.gameEngineService.reactToInteraction(
      reaction.reactionType,
      gameId,
    );
  }
}
