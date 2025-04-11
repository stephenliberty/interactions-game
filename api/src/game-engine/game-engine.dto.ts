import { IsOptional } from 'class-validator';

export class UpdateGameplayStateDto {
  @IsOptional()
  activePlayer: string;
}

export class GetGameplayDto {
  gameId: string;
  activePlayer: string;
}
