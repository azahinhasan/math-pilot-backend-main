import { ICommand } from '@nestjs/cqrs';
import { CanvasDataItem } from '../dto/evaluate-practice.dto';

export class EvaluatePracticeCommand implements ICommand {
  constructor(
    public readonly questionId: string,
    public readonly canvasData: string,
    public readonly files: Express.Multer.File[],
    public readonly currentStepCount: string,
    public readonly clerkId: string,
    public readonly timeSpent: number,
    public readonly chatHistory?: string,
  ) {}
}
