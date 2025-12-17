import { ICommand } from '@nestjs/cqrs';
import { CreateMockExamDto } from '../dto/create-mock-exam.dto';

export class CreateMockExamCommand implements ICommand {
  constructor(public readonly payload: CreateMockExamDto) {}
}


