import 'tsconfig-paths/register';
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
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3000;
    // if (nodeEnv === 'production') {
  //   app.enableCors({
  //     origin: configService.get<string>('app.frontendUrl'),
  //     credentials: true,
  //     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  //     allowedHeaders: 'Content-Type, Accept, Authorization',
  //   });
  // } else {
  //   app.enableCors({ origin: true, credentials: true });
  // }
  app.enableCors({ origin: true, credentials: true });
  await app.listen(port).then(() => {
    console.log(`
          ####################################
          🔥  Server listening on port: http://localhost:${port} 🔥
          ####################################
    `);
  });
}
bootstrap();
