import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateTopicCommand } from '../create-topic.command';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@CommandHandler(CreateTopicCommand)
export class CreateTopicHandler
  implements ICommandHandler<CreateTopicCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateTopicCommand) {
    const {
      name,
      moduleId,
      serialNumber,
      paperNumber,
      description,
      logoFileName,
    } = command;

    try {
      const module = await this.prisma.module.findUnique({
        where: { id: moduleId },
      });

      if (!module) {
        throw new NotFoundException('Module not found');
      }

      if (module.voided) {
        throw new ConflictException('Cannot create topic for a voided Module');
      }

      const topic = await this.prisma.topic.create({
        data: {
          name,
          moduleId,
          serialNumber,
          paperNumber,
          description,
          logoFileName,
        },
      });

      return {
        message: 'Topic created successfully',
        data: topic,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to create Topic: ${error.message}`,
      );
    }
  }
}
