export class SaveActiveCanvasCommand {
  constructor(
    public readonly questionId: string,
    public readonly clerkId: string,
    public readonly canvasJson: string,
    public readonly hint?: string,
  ) {}
}
