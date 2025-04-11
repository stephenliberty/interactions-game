import * as request from 'supertest';
import { createApp } from '../../test/app.helper';

describe('game', () => {
  let app;
  beforeAll(async () => {
    app = await createApp();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('should throw 404 not found on an invalid game', async () => {
    return request(app.getHttpServer()).get(`/game/arbitraryid`).expect(404);
  });
});
