import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  Param,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateExamCommand } from './commands/create-exam.command';
import { CreateMockExamDto } from './dto/create-mock-exam.dto';
import { CreateMockExamCommand } from './commands/create-mock-exam.command';
import { GetExamSolutionsQuery } from './queries/get-exam-solutions.query';
import { GetExamSubmissionsQuery } from './queries/get-exam-submissions.query';
import { ClerkAuthGuard } from '../../clerk-auth-guard';
import { GetExamHistoryQuery } from './queries/get-exam-history.query';
import { GetExamQuestionsQuery } from './queries/get-exam-questions.query';
import { GetExamHistoryDto } from './dto/get-exam-history.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubmitTestDto } from './dto/submit-test.dto';
import { SubmitTestCommand } from './commands/submit-test.command';
import { ExamsService } from './exams.service';
import { GetMockPastPapersQuery } from './queries/get-mock-past-papers.query';
import { FilesInterceptor } from '@nestjs/platform-express';

/**
 * Controller for managing Exam-related operations, including creation and historical retrieval.
 */
@Controller('exams')
@UseGuards(ClerkAuthGuard)
export class ExamsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
    private readonly examsService: ExamsService,
  ) {}

  /**
   * Endpoint to create a new exam.
   * Protected by ClerkAuthGuard.
   */
  @Post()
  async createExam(@Body() dto: CreateExamDto) {
    return this.commandBus.execute(new CreateExamCommand(dto));
  }

  /**
   * Endpoint to create a new mock exam.
   * Protected by ClerkAuthGuard.
   */
  @Post('mock')
  async createMockExam(@Body() dto: CreateMockExamDto) {
    return this.commandBus.execute(new CreateMockExamCommand(dto));
  }

  /**
   * GET /exams/mock/past-papers
   * Lists available past papers for mock exams.
   * Protected by ClerkAuthGuard.
   */
  @Get('mock/past-papers')
  async getMockPastPapers(
    @Query('moduleId') moduleId?: string,
    @Query('boardId') boardId?: string,
  ) {
    return this.queryBus.execute(new GetMockPastPapersQuery(moduleId, boardId));
  }

  /**
   * GET /exams/history
   * Lists historical entries for tests attempted by the student.
   * Authenticated via Clerk JWT.
   */
  @Get('history')
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

  /**
   *
   * GET /exams/:examId/questions
   * Retrieves all questions for a specific exam (without solutions).
   * Protected by ClerkAuthGuard.
   ** @param examId The ID of the exam to retrieve questions for.
   ** @returns A promise that resolves to the exam questions.
   */
  @Get(':examId/questions')
  @UseGuards(ClerkAuthGuard)
  async getExamQuestions(@Param('examId') examId: string) {
    return this.queryBus.execute(new GetExamQuestionsQuery(examId));
  }

  /**
   *
   * GET /exams/:examId/solutions
   * Retrieves all question solutions for a specific exam.
   * Protected by ClerkAuthGuard.
   ** @param examId The ID of the exam to retrieve solutions for.
   ** @returns A promise that resolves to the exam solutions.
   */
  @Get(':examId/solutions')
  async getExamSolutions(@Param('examId') examId: string) {
    return this.queryBus.execute(new GetExamSolutionsQuery(examId));
  }

  /**
   *
   * GET /exams/:examId/submissions
   * Retrieves all question submissions for a specific exam for the logged-in student.
   * Protected by ClerkAuthGuard.
   ** @param examId The ID of the exam to retrieve submissions for.
   ** @returns A promise that resolves to the exam submissions.
   */
  @Get(':examId/submissions')
  async getExamSubmissions(@Param('examId') examId: string, @Req() req) {
    const clerkId = req.user.sub;
    const auth = await this.prisma.auth.findUnique({
      where: { clerkId },
      include: { student: true },
    });

    if (!auth?.student) {
      throw new HttpException('User is not a student', HttpStatus.BAD_REQUEST);
    }

    return this.queryBus.execute(
      new GetExamSubmissionsQuery(examId, auth.student.id),
    );
  }

  /**
   * POST /exams/submit
   * Submit test answers for evaluation
   * Protected by ClerkAuthGuard.
   */
  @Post('submit')
  @UseInterceptors(FilesInterceptor('images'))
  async submitTest(
    @Body() dto: SubmitTestDto,
    @Req() req,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.commandBus.execute(
      new SubmitTestCommand(dto, req.user.sub, files),
    );
  }

  /**
   * GET /exams/status
   * Get exam statuses for the authenticated user
   * Returns graded/submitted status for each exam based on all submissions
   * Protected by ClerkAuthGuard.
   */
  @Get('status')
  async getExamStatuses(@Req() req) {
    // 1. Extract Clerk ID from the authenticated request's JWT claims
    const clerkId = req.user.sub;

    // 2. Resolve the student record associated with this Clerk user
    const auth = await this.prisma.auth.findUnique({
      where: { clerkId },
      include: { student: true },
    });

    // If no student record is found, return empty result
    if (!auth || !auth.student) {
      return {
        status: 'success',
        message: 'Student record not found for this user',
        data: {
          studentId: null,
          exams: [],
          totalExams: 0,
        },
      };
    }

    // 3. Get exam statuses from service
    return this.examsService.getUserExamStatuses(auth.student.id);
  }
}
