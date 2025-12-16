import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterUserCommand } from '../register-user.command';
import clerkClient from '@clerk/clerk-sdk-node';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from 'types/role-type';

@Injectable()
@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler
  implements ICommandHandler<RegisterUserCommand>, OnModuleInit
{
  private roles: Map<string, string> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const roles = await this.prisma.role.findMany();
    roles.forEach((role) => {
      this.roles.set(role.name.toUpperCase(), role.id);
    });
  }
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

      const roleId = this.roles.get(role.toUpperCase());
      if (!roleId) {
        throw new NotFoundException(`Role '${role}' not found`);
      }

      const createdUser = await this.prisma.$transaction(async (prisma) => {
        const auth = await prisma.auth.create({
          data: {
            email: email,
            clerkId: user.id,
            roleId: roleId
          },
        });

        const commonData = {
          fullName: name,
          authId: auth.id,
        };

        if (role === Role.GUARDIAN) {
          await prisma.guardian.create({
            data: { ...commonData, ...additionalInfo },
          });
        } else if (role === Role.STUDENT) {
          await prisma.student.create({
            data: { ...commonData, ...additionalInfo },
          });
        }

        return {
          id: user.id,
          email: user.emailAddresses[0].emailAddress,
          name: `${user.firstName} ${user.lastName}`,
          role: user.publicMetadata.role,
          // clerkUser:user
        };
      });

      return {
        message: 'User registration processed successfully',
        user: createdUser,
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
