import * as request from 'supertest';
import { GameHelper } from '../../test/game.helper';
import { UpdatePlayerGameDto } from './player.dto';
import { createApp } from '../../test/app.helper';

describe('player', () => {
  let app;
  beforeAll(async () => {
    app = await createApp();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  describe('joining', () => {
    it('should throw 404 not found upon trying to join a valid game with a bad password', async () => {
      const createGameResp = await request(app.getHttpServer()).post(
        `/v1/game`,
      );
      const gameId = createGameResp.body.id;

      return request(app.getHttpServer())
        .post(`/game/${gameId}/join`)
        .send({ password: 'keyboardcat' })
        .expect(404);
    });

    it('should throw allow user to join a valid game with a valid password', async () => {
      const creatorAgent = request.agent(app.getHttpServer());
      const joinerAgent = request.agent(app.getHttpServer());
      const gameId = (await creatorAgent.post(`/v1/game`)).body.id;
      const password = (
        await creatorAgent
          .get(`/v1/game/${gameId}/password`)
          .responseType('json')
      ).body.toString();

      await creatorAgent
        .post(`/v1/game/${gameId}/players/join`)
        .send({ password: password })
        .expect(201);

      await joinerAgent
        .post(`/v1/game/${gameId}/players/join`)
        .send({ password: password })
        .expect(201);
      return joinerAgent
        .get(`/v1/game/${gameId}/players/players`)
        .expect(200)
        .expect(function (res) {
          if (res.body.length !== 2) {
            throw new Error('Expected two players in game');
          }
        });
    });
  });

  describe('updating user', () => {
    let game: GameHelper;
    beforeEach(async () => {
      game = new GameHelper(app);
      await game.createGame();
    });
    it('will update the current user with the appropriate prefs', async () => {
      await game
        .getGameCreatorAgent()
        .patch(`/v1/game/${game.getGameId()}/players/me`)
        .send({
          display_name: 'Bob Jones',
        } as UpdatePlayerGameDto)
        .expect(200);
      await game
        .getGameCreatorAgent()
        .get(`/v1/game/${game.getGameId()}/players/players`)
        .responseType('json')
        .expect((res) => {
          expect(JSON.parse(res.body)[0].display_name).toEqual('Bob Jones');
        });
    });
  });
});
