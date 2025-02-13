import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import * as session from 'express-session';
import * as DynamoDBStore from 'dynamodb-store';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.use(
    session({
      secret: process.env.COOKIE_SECRET,
      store: new DynamoDBStore({
        table: {
          name: 'sessions',
          hashKey: 'id',
        },
        dynamoConfig: {
          endpoint: process.env.DYNAMODB_ENDPOINT_URL || undefined,
        },
      }),
      resave: false,
      saveUninitialized: false,
    }),
  );
  app.enableVersioning({
    type: VersioningType.URI,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
