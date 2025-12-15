import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { ClerkModule } from './clerk/clerk.module';
import { PrismaModule } from './prisma/prisma.module';
import { PracticeModeModule } from './modules/practice-mode/practice-mode.module';
import { RoleModule } from './modules/role/role.module';
import { BoardAgeLevelModule } from './modules/board-age-level/board-age-level.module';
import { ModulesModule } from './modules/modules/modules.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    UsersModule,
    ClerkModule,
    PrismaModule,
    PracticeModeModule,
    RoleModule,
    BoardAgeLevelModule,
    ModulesModule,
  ], // Read .env file for environment variables
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
