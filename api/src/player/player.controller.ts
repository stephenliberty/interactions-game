import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { IdentityService } from '../identity/identity.service';
import { PlayerService } from './player.service';
import { Request } from 'express';
import { GameService } from '../game/game.service';
import { UpdatePlayerGameDto } from './player.dto';

@Controller({
  version: '1',
  path: 'game/:game_id/players',
})
export class PlayerController {
  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,

    private readonly identityService: IdentityService,
  ) {}

  @Post('/join')
  async joinGame(
    @Req() request: Request,
    @Param('game_id') id: string,
    @Body() body: { password: string },
  ) {
    const game = await this.gameService.getGameById(id);
    if (!game) {
      //We're doing this so that we're not confirming a game exists, making it slightly more difficult to brute force
      //Ex: if I throw a not-found, I know that the ID I tried doesn't exist and I move on. If I throw an unauthorized,
      //I don't know if it's because I am using a bad ID or if I'm using a bad password.
      //Technically you can probably figure out which based on response times but that's a little much to deal with
      //right now.
      throw new UnauthorizedException();
    }
    const pw = await this.gameService.getGamePassword(id);
    if (pw != body.password) {
      throw new UnauthorizedException();
    }
    this.identityService.patchSessionInformation(request); //TODO: Move this into its own controller

    await this.playerService.joinUserToGame(id, request.session.user_id);
  }

  @Patch('/me')
  async updateUserPrefs(
    @Param('game_id') gameId: string,
    @Req() request: Request,
    @Body() update: UpdatePlayerGameDto,
  ) {
    return this.playerService.updateUser(
      gameId,
      request.session.user_id,
      update,
    );
  }
}
