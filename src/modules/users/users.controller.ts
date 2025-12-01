import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  InternalServerErrorException,
  Delete,
  Param,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetUsersQuery } from './queries/get-users.query';
import { GetUserQuery } from './queries/get-user.query';
import { RegisterUserCommand } from './commands/register-user.command';
import { ClerkAuthGuard } from '../../clerk-auth-guard';

import { DeleteUserCommand } from './commands/delete-user.command';

import { RegisterUserDto } from './dto/register-user.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async getUsers() {
    return this.queryBus.execute(new GetUsersQuery());
  }

  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    const { email, name, role, password, additionalInfo } = registerUserDto;
    return this.commandBus.execute(
      new RegisterUserCommand(email, name, role, password, additionalInfo),
    );
  }

  @Get('profile')
  @UseGuards(ClerkAuthGuard)
  async getProfile(@Req() req) {
    try {
      // req.user is populated by ClerkAuthGuard with the JWT claims
      const userId = req.user.sub;

      // Execute Query to fetch user details
      const user = await this.queryBus.execute(new GetUserQuery(userId));

      return {
        message: 'Profile retrieved successfully',
        user,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch user details: ${error.message}`,
      );
    }
  }

  @Delete(':id')
  @UseGuards(ClerkAuthGuard)
  // TODO: Restrict to admin or self. For dev, maybe open or just auth.
  // !WARN: This is unsafe for prod.
  async deleteUser(@Param('id') id: string) {
    return this.commandBus.execute(new DeleteUserCommand(id));
  }
}
