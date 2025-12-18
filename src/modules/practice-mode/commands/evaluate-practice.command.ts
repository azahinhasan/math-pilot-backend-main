import { ICommand } from '@nestjs/cqrs';
import { CanvasDataItem } from '../dto/evaluate-practice.dto';

export class EvaluatePracticeCommand implements ICommand {
  constructor(
    public readonly question_id: string,
    public readonly canvas_data: CanvasDataItem[],
    public readonly files: Express.Multer.File[],
    public readonly current_step_count: string,
    public readonly chat_history?: string,
  ) {}
}
