import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { ClerkModule } from './clerk/clerk.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot(), UsersModule, ClerkModule, PrismaModule], // Read .env file for environment variables
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
