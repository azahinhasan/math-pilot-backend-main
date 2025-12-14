import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteBoardAgeLevelCommand } from '../delete-board-age-level.command';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@CommandHandler(DeleteBoardAgeLevelCommand)
export class DeleteBoardAgeLevelHandler
  implements ICommandHandler<DeleteBoardAgeLevelCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteBoardAgeLevelCommand) {
    const { id } = command;

    try {
      const existingRecord = await this.prisma.boardAgeLevel.findUnique({
        where: { id },
      });

      if (!existingRecord) {
        throw new NotFoundException('Board Age Level not found');
      }

      const updated = await this.prisma.boardAgeLevel.update({
        where: { id },
        data: {
          voided: true,
        },
      });

      return {
        message: 'Board Age Level deleted successfully',
        data: updated,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to delete Board Age Level: ${error.message}`,
      );
    }
  }
}
