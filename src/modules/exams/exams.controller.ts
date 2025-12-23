import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateExamCommand } from './commands/create-exam.command';
import { CreateMockExamDto } from './dto/create-mock-exam.dto';
import { CreateMockExamCommand } from './commands/create-mock-exam.command';
import { GetExamHistoryDto } from './dto/get-exam-history.dto';
import { GetExamHistoryQuery } from './queries/get-exam-history.query';
import { ClerkAuthGuard } from 'src/clerk-auth-guard';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Controller for managing Exam-related operations, including creation and historical retrieval.
 */
@Controller('exams')
export class ExamsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
  ) {}

  // Unauthenticated for now (per request)
  @Post()
  async createExam(@Body() dto: CreateExamDto) {
    return this.commandBus.execute(new CreateExamCommand(dto));
  }

  // Unauthenticated for now (per request)
  @Post('mock')
  async createMockExam(@Body() dto: CreateMockExamDto) {
    return this.commandBus.execute(new CreateMockExamCommand(dto));
  }

  /**
   * GET /exams/history
   * Lists historical entries for tests attempted by the student.
   * Authenticated via Clerk JWT.
   */
  @Get('history')
  @UseGuards(ClerkAuthGuard)
  async getExamHistory(@Req() req, @Query() dto: GetExamHistoryDto) {
    // 1. Extract Clerk ID from the authenticated request's JWT claims
    const clerkId = req.user.sub;

    // 2. Resolve the student record associated with this Clerk user
    const auth = await this.prisma.auth.findUnique({
      where: { clerkId },
      include: { student: true },
    });

    // If no student record is found, return an empty history
    if (!auth || !auth.student) {
      return {
        message: 'Student record not found for this user',
        entries: [],
        meta: { total: 0, page: dto.page, limit: dto.limit, totalPages: 0 },
      };
    }

    // 3. Dispatch the query to the handler to fetch and aggregate exam submissions
    return this.queryBus.execute(new GetExamHistoryQuery(auth.student.id, dto));
  }
}


