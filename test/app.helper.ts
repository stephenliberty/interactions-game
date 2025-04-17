import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as session from 'express-session';
import { INestApplication, VersioningType } from '@nestjs/common';

import * as cookieParser from 'cookie-parser';

export async function createApp(): Promise<INestApplication<any>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
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
  return app;
}
