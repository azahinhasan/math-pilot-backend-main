import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateExamCommand } from './commands/create-exam.command';
import { CreateMockExamDto } from './dto/create-mock-exam.dto';
import { CreateMockExamCommand } from './commands/create-mock-exam.command';

@Controller('exams')
export class ExamsController {
  constructor(private readonly commandBus: CommandBus) {}

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
}


