import { CreateQuestionDto } from '../dto/create-question.dto';

export class CreateQuestionCommand {
  constructor(public readonly payload: CreateQuestionDto) {}
}


