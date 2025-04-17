import { INestApplication, Injectable } from '@nestjs/common';
import * as request from 'supertest';
import { Agent } from 'supertest';

@Injectable()
export class GameHelper {
  private agent: Agent;
  private gameId: string;
  private password: string;
  constructor(private readonly app: INestApplication) {}

  public async createGame() {
    this.agent = request.agent(this.app.getHttpServer());
    this.gameId = (await this.agent.post(`/v1/game`)).body.id;
    const res = await this.agent.patch(`/v1/game/${this.gameId}`).send({
      maxIntensity: 5,
    });
    console.log(res);
    this.password = (
      await this.agent
        .get(`/v1/game/${this.gameId}/password`)
        .responseType('json')
    ).body.toString();
    await this.joinAgentToGame(this.agent);
  }

  public getGamePassword() {
    return this.password;
  }
  public getGameId() {
    return this.gameId;
  }
  public getGameCreatorAgent() {
    return this.agent;
  }

  public async joinAgentToGame(agent: Agent) {
    await agent
      .post(`/v1/game/${this.gameId}/players/join`)
      .send({ password: this.password })
      .expect(201);
  }
}
