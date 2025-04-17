import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import * as session from 'express-session';
import * as DynamoDBStore from 'dynamodb-store';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

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
  const config = new DocumentBuilder()
    .setTitle('Interaction Game API')
    .setDescription('Interaction Game')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('openapi', app, documentFactory);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
