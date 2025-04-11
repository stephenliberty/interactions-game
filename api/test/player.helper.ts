import { Injectable } from '@nestjs/common';
import { Agent } from 'supertest';
import { GetPlayerGameDto } from '../src/player/player.dto';

@Injectable()
export class PlayerHelper {
  constructor(
    private readonly agent: Agent,
    private readonly gameId: string,
  ) {}

  getAgent() {
    return this.agent;
  }

  async getPlayerInformation(): Promise<GetPlayerGameDto> {
    return (await this.agent.get(`/v1/game/${this.gameId}/players/me`)).body;
  }
}
