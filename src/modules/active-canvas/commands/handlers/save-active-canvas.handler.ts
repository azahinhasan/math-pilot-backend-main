import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SaveActiveCanvasCommand } from '../save-active-canvas.command';
import { PrismaService } from 'src/prisma/prisma.service';

@CommandHandler(SaveActiveCanvasCommand)
export class SaveActiveCanvasHandler
  implements ICommandHandler<SaveActiveCanvasCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: SaveActiveCanvasCommand) {
    const { questionId, clerkId, hint, canvasJson } = command;
    console.log(questionId, clerkId, hint, canvasJson);

    const user = await this.prisma.auth.findUnique({
      where: { clerkId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const existingCanvas = await this.prisma.activeCanvas.findFirst({
      where: {
        questionId,
        userId: user.id,
      },
    });

    if (existingCanvas) {
      this.prisma.activeCanvas.update({
        where: {
          id: existingCanvas.id,
        },
        data: {
          hint,
          canvasJson,
        },
      });
      return {
        success: true,
        message: 'Active canvas updated successfully',
      };
    }

    this.prisma.activeCanvas.create({
      data: {
        questionId,
        userId: user.id,
        hint,
        canvasJson,
      },
    });

    return {
      success: true,
      message: 'Active canvas saved successfully',
    };
  }
}
