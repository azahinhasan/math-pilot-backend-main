import { ICommand } from '@nestjs/cqrs';
import { CreateExamDto } from '../dto/create-exam.dto';

export class CreateExamCommand implements ICommand {
  constructor(public readonly payload: CreateExamDto) {}
}


