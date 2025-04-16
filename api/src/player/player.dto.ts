import { IsOptional } from 'class-validator';

export enum PLAYER_STATES {
  JOINED = 'joined',
  PLAYING = 'playing',
  BLOCKED = 'blocked',
}

export enum GAMEPLAY_REACTION {
  PASS = 'pass',
  COMPLETE = 'complete',
}

export class GetPlayerGameDto {
  user_id: string;
  game_id: string;
  display_name: string;
  props: string[];
  state: PLAYER_STATES;
  points: number;
  features: string[];
  player_intensity: Record<string, number>;
  player_vicinity: Record<string, number>;
  intensity: number;
}
export class UpdatePlayerGameDto {
  @IsOptional()
  display_name?: string;
  @IsOptional()
  props?: string[];
  @IsOptional()
  state?: PLAYER_STATES;
  @IsOptional()
  features?: string[];
  @IsOptional()
  player_intensity?: Map<string, number>;
  @IsOptional()
  player_vicinity?: Record<string, number>;
  @IsOptional()
  intensity?: number;
}

export class PlayerDto {
  user_id: string;
  game_id: string;
  display_name: string;
  props: string[];
  state: PLAYER_STATES;
  features: string[];
  player_intensity: Map<string, number>;
  player_vicinity: Record<string, number>;
  intensity: number;
}
