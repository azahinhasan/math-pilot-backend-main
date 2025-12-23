import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteTopicCommand } from '../delete-topic.command';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@CommandHandler(DeleteTopicCommand)
export class DeleteTopicHandler
  implements ICommandHandler<DeleteTopicCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteTopicCommand) {
    const { id } = command;

    try {
      const existingRecord = await this.prisma.topic.findUnique({
        where: { id },
      });

      if (!existingRecord) {
        throw new NotFoundException('Topic not found');
      }

      const updated = await this.prisma.topic.update({
        where: { id },
        data: {
          voided: true,
        },
      });

      return {
        message: 'Topic deleted successfully',
        data: updated,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to delete Topic: ${error.message}`,
      );
    }
  }
}
