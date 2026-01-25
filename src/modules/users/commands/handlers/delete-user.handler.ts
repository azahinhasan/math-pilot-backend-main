import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteUserCommand } from '../delete-user.command';
import { Inject, Injectable } from '@nestjs/common';
import type { ClerkClient } from '@clerk/backend';
import { CLERK_CLIENT } from 'src/clerk/clerk.provider';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
  constructor(
    @Inject(CLERK_CLIENT) private readonly clerkClient: ClerkClient,
  ) {}

  /**
   * Deletes a user from Clerk by their User ID.
   * This is irreversible.
   */
  async execute(command: DeleteUserCommand) {
    const { userId } = command;
    try {
      await this.clerkClient.users.deleteUser(userId);
      return { message: 'User deleted successfully' };
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException('User not found');
      }
      throw new InternalServerErrorException(
        `Failed to delete user: ${error.message}`,
      );
    }
  }
}
