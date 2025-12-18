import { Role } from 'types/role-type';

export class RegisterUserCommand {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly role: Role,
    public readonly password?: string,
    public readonly additionalInfo?: any,
  ) {
    console.log(this.email, this.name, this.password, this.additionalInfo);
  }
}
