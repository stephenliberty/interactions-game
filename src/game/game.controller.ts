import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto, GetGameDto, UpdateGameDto } from './game.dto';
import { Request } from 'express';
import { IdentityService } from '../identity/identity.service';
import { GameOwnerGuard } from './game-owner.guard';
import { GamePlayerGuard } from '../player/game-player.guard';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller({
  version: '1',
  path: 'game',
})
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly identityService: IdentityService,
  ) {}

  @Post()
  @ApiResponse({
    status: 200,
    description: 'New game data',
  })
  async createNewGame(@Req() request: Request): Promise<CreateGameDto> {
    this.identityService.patchSessionInformation(request); //TODO: Move this into its own controller
    return await this.gameService.createNewGame(request.session.user_id);
  }
  @Get(':gameId')
  @UseGuards(GamePlayerGuard)
  @ApiResponse({
    status: 200,
    description: 'Game data',
  })
  @ApiResponse({
    status: 404,
  })
  async getGame(@Param('gameId') id: string): Promise<GetGameDto> {
    return await this.gameService.getGameById(id);
  }

  @ApiResponse({
    status: 200,
    description: 'Game data',
  })
  @ApiOperation({})
  @Patch(':gameId')
  @UseGuards(GameOwnerGuard)
  async updateGame(@Param('gameId') id: string, @Body() body: UpdateGameDto) {
    return await this.gameService.updateGame(id, body);
  }

  @ApiOperation({})
  @ApiResponse({
    status: 200,
    description: 'Game data',
    type: String,
  })
  @UseGuards(GameOwnerGuard)
  @Get(':gameId/password')
  async getPassword(@Param('gameId') id: string) {
    return await this.gameService.getGamePassword(id);
  }
}
