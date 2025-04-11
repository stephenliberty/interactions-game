import { GameHelper } from '../../test/game.helper';
import * as request from 'supertest';
import { createApp } from '../../test/app.helper';
import {
  PLAYER_STATES,
  PlayerDto,
  UpdatePlayerGameDto,
} from '../player/player.dto';
import { PlayerHelper } from '../../test/player.helper';
import { GAME_STATES } from '../game/game.dto';

describe('game engine', () => {
  let app;
  beforeAll(async () => {
    app = await createApp();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  describe('starting game', () => {
    let game: GameHelper;
    let playerHelper: PlayerHelper;
    let gameCreatorHelper: PlayerHelper;
    beforeEach(async () => {
      game = new GameHelper(app);
      await game.createGame();
      playerHelper = new PlayerHelper(
        request.agent(app.getHttpServer()),
        game.getGameId(),
      );
      gameCreatorHelper = new PlayerHelper(
        game.getGameCreatorAgent(),
        game.getGameId(),
      );
    });
    it('will throw an error if all players are not ready', async () => {
      await game.joinAgentToGame(playerHelper.getAgent());
      await game
        .getGameCreatorAgent()
        .post(`/v1/game-engine/${game.getGameId()}/start`)
        .responseType('json')
        .expect(409);
    });
    it('will start the game if all players are ready', async () => {
      await game.joinAgentToGame(playerHelper.getAgent());

      await game
        .getGameCreatorAgent()
        .patch(`/v1/game/${game.getGameId()}/players/me`)
        .send({
          display_name: 'Bob Jones',
          player_intensity: Object.fromEntries(
            new Map<string, number>([
              [(await playerHelper.getPlayerInformation()).user_id, 3],
            ]),
          ),
          intensity: 1,
          features: [],
          props: [],
          state: PLAYER_STATES.JOINED,
        })
        .expect(200);
      await playerHelper
        .getAgent()
        .patch(`/v1/game/${game.getGameId()}/players/me`)
        .send({
          display_name: 'John Jones',
          player_intensity: Object.fromEntries(
            new Map<string, number>([
              [(await gameCreatorHelper.getPlayerInformation()).user_id, 3],
            ]),
          ),
          intensity: 1,
          features: [],
          props: [],
          state: PLAYER_STATES.JOINED,
        })
        .expect(200);

      await game
        .getGameCreatorAgent()
        .post(`/v1/game-engine/${game.getGameId()}/start`)
        .responseType('json')
        .expect(201);
      await game
        .getGameCreatorAgent()
        .get(`/v1/game/${game.getGameId()}`)
        .responseType('json')
        .expect((res) => {
          expect(JSON.parse(res.body).state).toEqual(GAME_STATES.ACTIVE);
        });
    });
  });
});
