import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateModuleCommand } from '../create-module.command';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@CommandHandler(CreateModuleCommand)
export class CreateModuleHandler
  implements ICommandHandler<CreateModuleCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateModuleCommand) {
    const {
      name,
      boardAgeLevelId,
      subject,
      description,
      formulaBookUrl,
      logoFileName,
    } = command;

    try {
      const boardAgeLevel = await this.prisma.boardAgeLevel.findUnique({
        where: { id: boardAgeLevelId },
      });

      if (!boardAgeLevel) {
        throw new NotFoundException('Board Age Level not found');
      }

      if (boardAgeLevel.voided) {
        throw new ConflictException('Cannot create module for a voided Board Age Level');
      }

      const module = await this.prisma.module.create({
        data: {
          name,
          boardAgeLevelId,
          subject,
          description,
          formulaBookUrl,
          logoFileName,
        },
      });

      return {
        message: 'Module created successfully',
        data: module,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to create Module: ${error.message}`,
      );
    }
  }
}
