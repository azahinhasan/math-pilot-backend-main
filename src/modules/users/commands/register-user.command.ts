export class RegisterUserCommand {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly role: RoleType,
    public readonly password?: string,
    public readonly additionalInfo?: any,
  ) {}
}
