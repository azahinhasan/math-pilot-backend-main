import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateBoardAgeLevelCommand } from '../update-board-age-level.command';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@CommandHandler(UpdateBoardAgeLevelCommand)
export class UpdateBoardAgeLevelHandler
  implements ICommandHandler<UpdateBoardAgeLevelCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateBoardAgeLevelCommand) {
    const { id, boardName, ageLevelName } = command;

    try {
      const existingRecord = await this.prisma.boardAgeLevel.findUnique({
        where: { id },
      });

      if (!existingRecord) {
        throw new NotFoundException('Board Age Level not found');
      }

      if (existingRecord.voided) {
        throw new ConflictException('Cannot update a voided Board Age Level');
      }

      if (boardName || ageLevelName) {
        const finalBoardName = boardName || existingRecord.boardName;
        const finalAgeLevelName = ageLevelName || existingRecord.ageLevelName;

        const duplicate = await this.prisma.boardAgeLevel.findFirst({
          where: {
            boardName: finalBoardName,
            ageLevelName: finalAgeLevelName,
            id: { not: id },
          },
        });

        if (duplicate) {
          throw new ConflictException(
            'Board and Age Level combination already exists',
          );
        }
      }

      const updateData: any = {};
      if (boardName) updateData.boardName = boardName;
      if (ageLevelName) updateData.ageLevelName = ageLevelName;

      const updated = await this.prisma.boardAgeLevel.update({
        where: { id },
        data: updateData,
      });

      return {
        message: 'Board Age Level updated successfully',
        data: updated,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to update Board Age Level: ${error.message}`,
      );
    }
  }
}
