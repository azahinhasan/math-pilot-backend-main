import { UpdateUserConfigDto } from '../dto/update-user-config.dto';

/**
 * Command to update user configurations.
 * Decouples the request from the business logic.
 */
export class UpdateUserConfigCommand {
  constructor(
    public readonly clerkId: string,
    public readonly dto: UpdateUserConfigDto,
  ) {}
}

