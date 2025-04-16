import { IsOptional } from 'class-validator';

export class UpdateGameplayStateDto {
  @IsOptional()
  activePlayer?: string;
  @IsOptional()
  activeInteraction?: {
    interactionText: string;
    interactionId: string;
    fromPlayer: string;
    toPlayer: string;
  };
  points?: Map<string, number>;
}

export class GetGameplayDto {
  gameId: string;
  activePlayer: string;
  points: Map<string, number>;
  activeInteraction?: {
    intensity: number;
    interactionText: string;
    interactionId: string;
    fromPlayer: string;
    toPlayer: string;
  };
}

// export class InteractionDto {
//   requiredFeatures
//   requiredProps
//
// }
