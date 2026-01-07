export class SaveActiveCanvasCommand {
  constructor(
    public readonly questionId: string,
    public readonly clerkId: string,
    public readonly canvasData: string,
    public readonly hint?: string,
  ) {}
}
