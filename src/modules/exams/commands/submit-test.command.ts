import { SubmitTestDto } from '../dto/submit-test.dto';

export class SubmitTestCommand {
  constructor(public readonly dto: SubmitTestDto) {}
}

