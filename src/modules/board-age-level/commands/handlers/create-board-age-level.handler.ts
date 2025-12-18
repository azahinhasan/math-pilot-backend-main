import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateBoardAgeLevelCommand } from '../create-board-age-level.command';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@CommandHandler(CreateBoardAgeLevelCommand)
export class CreateBoardAgeLevelHandler
  implements ICommandHandler<CreateBoardAgeLevelCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateBoardAgeLevelCommand) {
    const { boardName, ageLevelName } = command;

    try {
      const existingRecord = await this.prisma.boardAgeLevel.findUnique({
        where: {
          boardName_ageLevelName: {
            boardName,
            ageLevelName,
          },
        },
      });

      if (existingRecord && !existingRecord.voided) {
        throw new ConflictException(
          'Board and Age Level combination already exists',
        );
      }

      if (existingRecord && existingRecord.voided) {
        const updated = await this.prisma.boardAgeLevel.update({
          where: { id: existingRecord.id },
          data: {
            voided: false,
            updatedAt: new Date(),
          },
        });

        return {
          message: 'Board Age Level reactivated successfully',
          data: updated,
        };
      }

      const boardAgeLevel = await this.prisma.boardAgeLevel.create({
        data: {
          boardName,
          ageLevelName,
        },
      });

      return {
        message: 'Board Age Level created successfully',
        data: boardAgeLevel,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to create Board Age Level: ${error.message}`,
      );
    }
  }
}
