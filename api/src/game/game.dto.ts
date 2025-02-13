import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum GAME_STATES {
  CREATED = 'created',
  VALIDATING = 'validating',
  ACTIVE = 'active',
  COMPLETE = 'complete',
}

export class CreateGameDto {
  id: string;
  owner: string;
}

export class GetGameDto {
  id: string;
  props: string[];
  maxIntensity: number;
  virtualOnly: boolean;
  owner: string;
  state: GAME_STATES;
  activeUser: string;
}

export class UpdateGameDto {
  @IsArray()
  @IsOptional()
  props?: string[];

  @IsNumber()
  @IsOptional()
  maxIntensity?: number;

  @IsBoolean()
  @IsOptional()
  virtualOnly?: boolean;
}
