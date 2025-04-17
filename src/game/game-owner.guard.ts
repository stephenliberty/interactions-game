import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GameService } from './game.service';

@Injectable()
export class GameOwnerGuard implements CanActivate {
  constructor(private gameService: GameService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    try {
      const game = await this.gameService.getGameById(request.params.gameId);
      return game.owner == request.session.user_id;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
