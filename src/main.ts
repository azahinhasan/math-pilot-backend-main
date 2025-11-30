import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove properties not in the DTO
      transform: true, // Auto-transform payloads
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
