import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { UsersController } from './users.controller';
import { GetUsersHandler } from './queries/handlers/get-users.handler';
import { GetUserHandler } from './queries/handlers/get-user.handler';
import { RegisterUserHandler } from './commands/handlers/register-user.handler';
import { DeleteUserHandler } from './commands/handlers/delete-user.handler';

@Module({
  imports: [CqrsModule, ConfigModule],
  controllers: [UsersController],
  providers: [
    GetUsersHandler,
    GetUserHandler,
    RegisterUserHandler,
    DeleteUserHandler,
  ],
})
export class UsersModule {}
