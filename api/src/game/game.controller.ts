import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto, GetGameDto, UpdateGameDto } from './game.dto';
import { Request } from 'express';
import { IdentityService } from '../identity/identity.service';
import { PlayerService } from '../player/player.service';

@Controller({
  version: '1',
  path: 'game',
})
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
    private readonly identityService: IdentityService,
  ) {}

  @Post()
  async createNewGame(@Req() request: Request): Promise<CreateGameDto> {
    this.identityService.patchSessionInformation(request); //TODO: Move this into its own controller
    return await this.gameService.createNewGame(request.session.user_id);
  }
  @Get(':id')
  async getGame(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<GetGameDto> {
    if (
      !(await this.playerService.userIsPartOfGame(id, request.session.user_id))
    ) {
      throw new NotFoundException();
    }
    return await this.gameService.getGameById(id);
  }
  @Patch(':id')
  async updateGame(
    @Param('id') id: string,
    @Req() request: Request,
    @Body() body: UpdateGameDto,
  ) {
    return await this.gameService.updateGameIfPermitted(
      request.session.user_id,
      id,
      body,
    );
  }

  @Get(':id/password')
  async getPassword(@Req() request: Request, @Param('id') id: string) {
    const game = await this.gameService.getGameById(id);
    if (!game) {
      throw new NotFoundException();
    }
    if (game.owner != request.session.user_id) {
      throw new UnauthorizedException();
    }

    return await this.gameService.getGamePassword(id);
  }
}
