import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterUserCommand } from '../register-user.command';
import clerkClient from '@clerk/clerk-sdk-node';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler
  implements ICommandHandler<RegisterUserCommand>
{
  /**
   * Handles user registration by creating a user in Clerk.
   *
   * Logic:
   * 1. Calls Clerk Backend API to create a user.
   * 2. Sets 'publicMetadata' to store the custom role (e.g., student, teacher, institution, parent).
   * 3. Handles password optionality (skip checks if not provided possibly for using SSO instead).
   * 4. Catches 'form_identifier_exists' to throw a 409 Conflict if email is taken.
   */
  async execute(command: RegisterUserCommand) {
    const { email, name, role, password, additionalInfo } = command;

    try {
      const user = await clerkClient.users.createUser({
        emailAddress: [email],
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || '',
        password: password,
        publicMetadata: {
          role,
          ...additionalInfo,
        },
        skipPasswordChecks: !password,
        skipPasswordRequirement: !password,
      });

      return {
        message: 'User registration processed successfully',
        user: {
          id: user.id,
          email: user.emailAddresses[0].emailAddress,
          name: `${user.firstName} ${user.lastName}`,
          role: user.publicMetadata.role,
          clerkUser: user,
        },
      };
    } catch (error) {
      console.error(
        'Clerk Registration Error:',
        JSON.stringify(error, null, 2),
      );

      if (error.errors?.[0]?.code === 'form_identifier_exists') {
        throw new ConflictException('User with this email already exists');
      }

      throw new InternalServerErrorException(
        `Failed to create user: ${error.errors?.[0]?.message || error.message}`,
      );
    }
  }
}
