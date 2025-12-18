import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteModuleCommand } from '../delete-module.command';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@CommandHandler(DeleteModuleCommand)
export class DeleteModuleHandler
  implements ICommandHandler<DeleteModuleCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteModuleCommand) {
    const { id } = command;

    try {
      const existingRecord = await this.prisma.module.findUnique({
        where: { id },
      });

      if (!existingRecord) {
        throw new NotFoundException('Module not found');
      }

      const updated = await this.prisma.module.update({
        where: { id },
        data: {
          voided: true,
        },
      });

      return {
        message: 'Module deleted successfully',
        data: updated,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to delete Module: ${error.message}`,
      );
    }
  }
}
