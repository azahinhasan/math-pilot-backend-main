import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateExamCommand } from './commands/create-exam.command';
import { CreateMockExamDto } from './dto/create-mock-exam.dto';
import { CreateMockExamCommand } from './commands/create-mock-exam.command';
import { GetExamSolutionsQuery } from './queries/get-exam-solutions.query';
import { ClerkAuthGuard } from '../../clerk-auth-guard';

@Controller('exams')
export class ExamsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Endpoint to create a new exam.
   * Protected by ClerkAuthGuard.
   */
  @Post()
  @UseGuards(ClerkAuthGuard)
  async createExam(@Body() dto: CreateExamDto) {
    return this.commandBus.execute(new CreateExamCommand(dto));
  }

  /**
   * Endpoint to create a new mock exam.
   * Protected by ClerkAuthGuard.
   */
  @Post('mock')
  @UseGuards(ClerkAuthGuard)
  async createMockExam(@Body() dto: CreateMockExamDto) {
    return this.commandBus.execute(new CreateMockExamCommand(dto));
  }

  /**
   * GET /exams/:examId/solutions
   * Retrieves all question solutions for a specific exam.
   * Protected by ClerkAuthGuard.
   */
  @Get(':examId/solutions')
  @UseGuards(ClerkAuthGuard)
  async getExamSolutions(@Param('examId') examId: string) {
    return this.queryBus.execute(new GetExamSolutionsQuery(examId));
  }
}


