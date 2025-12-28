import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UpdateUserConfigCommand } from '../update-user-config.command';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

/**
 * Handler for the UpdateUserConfigCommand.
 * Updates user settings and profile information based on the user's role.
 */
@Injectable()
@CommandHandler(UpdateUserConfigCommand)
export class UpdateUserConfigHandler
  implements ICommandHandler<UpdateUserConfigCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateUserConfigCommand): Promise<any> {
    const { clerkId, dto } = command;
    const { username, email, fullName, country, boardAgeLevelId } = dto;

    try {
      // Find the authenticated user
      const auth = await this.prisma.auth.findUnique({
        where: { clerkId },
        include: {
          role: true,
          student: true,
          guardian: true,
        },
      });

      if (!auth) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Prepare update data for Auth table
      const authUpdateData: any = {};
      if (username !== undefined) authUpdateData.username = username;
      if (email !== undefined) authUpdateData.email = email;

      // Update Auth if there are changes
      if (Object.keys(authUpdateData).length > 0) {
        await this.prisma.auth.update({
          where: { id: auth.id },
          data: authUpdateData,
        });
      }

      // Update role-specific profile information
      const roleName = auth.role.name.toLowerCase();

      if (roleName === 'student' && auth.student) {
        const studentUpdateData: any = {};
        if (fullName !== undefined) studentUpdateData.fullName = fullName;
        if (country !== undefined) studentUpdateData.country = country;
        if (boardAgeLevelId !== undefined) {
          // Validate boardAgeLevelId
          const boardAgeLevel = await this.prisma.boardAgeLevel.findUnique({
            where: { id: boardAgeLevelId },
          });
          if (!boardAgeLevel) {
            throw new HttpException(
              'Invalid board age level specified',
              HttpStatus.BAD_REQUEST,
            );
          }
          studentUpdateData.boardAgeLevelId = boardAgeLevelId;
        }

        if (Object.keys(studentUpdateData).length > 0) {
          await this.prisma.student.update({
            where: { id: auth.student.id },
            data: studentUpdateData,
          });
        }
      } else if (
        (roleName === 'guardian' || roleName === 'parent') &&
        auth.guardian
      ) {
        if (fullName !== undefined) {
          await this.prisma.guardian.update({
            where: { id: auth.guardian.id },
            data: { fullName },
          });
        }
      }

      return {
        message: 'User configuration updated successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle Prisma unique constraint errors (e.g., username/email already taken)
      if (error.code === 'P2002') {
        const target = error.meta?.target || [];
        if (target.includes('username')) {
          throw new HttpException('Username is already taken', HttpStatus.CONFLICT);
        }
        if (target.includes('email')) {
          throw new HttpException('Email is already taken', HttpStatus.CONFLICT);
        }
      }

      throw new HttpException(
        `Failed to update user configuration: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

