import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import { AppModule } from '../app.module';
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';

describe('game', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(
      session({
        secret: 'keyboard cat',
        cookie: {},
        resave: false,
        saveUninitialized: false,
      }),
    );
    app.use(cookieParser());
    app.enableVersioning({
      type: VersioningType.URI,
    });
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('should throw 404 not found upon trying to join a valid game with a bad password', async () => {
    const createGameResp = await request(app.getHttpServer()).post(`/v1/game`);
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
      await creatorAgent.get(`/v1/game/${gameId}/password`).responseType('json')
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
