import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersController } from './users.controller';
import { GetUsersHandler } from './queries/handlers/get-users.handler';
import { GetUserHandler } from './queries/handlers/get-user.handler';
import { RegisterUserHandler } from './commands/handlers/register-user.handler';
import { DeleteUserHandler } from './commands/handlers/delete-user.handler';
import { OnboardingHandler } from './commands/handlers/onboarding.handler';

@Module({
  imports: [CqrsModule, ConfigModule, PrismaModule],
  controllers: [UsersController],
  providers: [
    GetUsersHandler,
    GetUserHandler,
    RegisterUserHandler,
    DeleteUserHandler,
    OnboardingHandler,
  ],
})
export class UsersModule {}
