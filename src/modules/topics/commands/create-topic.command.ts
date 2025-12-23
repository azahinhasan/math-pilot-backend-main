export class CreateTopicCommand {
  constructor(
    public readonly name: string,
    public readonly moduleId: string,
    public readonly serialNumber: number,
    public readonly paperNumber: number,
    public readonly description?: string,
    public readonly logoFileName?: string,
  ) {}
}
