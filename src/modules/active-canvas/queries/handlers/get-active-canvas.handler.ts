import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetActiveCanvasQuery } from '../get-active-canvas.query';
import { PrismaService } from 'src/prisma/prisma.service';

@QueryHandler(GetActiveCanvasQuery)
export class GetActiveCanvasHandler implements IQueryHandler<GetActiveCanvasQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetActiveCanvasQuery) {
    const { questionId, clerkId } = query;

    const user = await this.prisma.auth.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return null;
    }

    const activeCanvas = await this.prisma.activeCanvas.findFirst({
      where: {
        questionId,
        userId: user.id,
      },
    });
    return {
      success: true,
      message: 'Active canvas retrieved successfully',
      data: activeCanvas,
    };
  }
}
