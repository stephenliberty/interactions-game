import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlayerService } from './player.service';
import { GameService } from '../game/game.service';

@Injectable()
export class GamePlayerGuard implements CanActivate {
  constructor(
    private playerService: PlayerService,
    private gameService: GameService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const game = await this.gameService.getGameById(request.params.gameId);
    if (game.owner == request.session.user_id) {
      return true;
    }
    const isPartOfGame = await this.playerService.userIsPartOfGame(
      request.params.gameId,
      request.session.user_id,
    );
    if (isPartOfGame) {
      return true;
    }
    throw new NotFoundException();
  }
}
