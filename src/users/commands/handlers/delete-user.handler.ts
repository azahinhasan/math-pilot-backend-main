import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteUserCommand } from '../delete-user.command';
import clerkClient from '@clerk/clerk-sdk-node';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
  async execute(command: DeleteUserCommand) {
    const { userId } = command;
    try {
      await clerkClient.users.deleteUser(userId);
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
