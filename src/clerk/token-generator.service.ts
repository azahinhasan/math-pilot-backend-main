import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import type { ClerkClient } from '@clerk/backend';
import { CLERK_CLIENT } from './clerk.provider';

@Injectable()
export class TokenGeneratorService {
  private readonly logger = new Logger(TokenGeneratorService.name);

  constructor(
    @Inject(CLERK_CLIENT) private readonly clerkClient: ClerkClient,
  ) {}

  /**
   * Generates a valid session token for a specific user or the first available user.
   * This token allows accessing protected routes as that user.
   * @param email Optional email to select a specific user.
   */
  async generateUserToken(
    email?: string,
  ): Promise<{ token: string; email: string; userId: string }> {
    try {
      let userId: string;
      let userEmail: string;

      if (email) {
        const users = await this.clerkClient.users.getUserList({
          emailAddress: [email],
          limit: 1,
        });
        if (users.data.length === 0) {
          throw new NotFoundException(`User with email ${email} not found.`);
        }
        userId = users.data[0].id;
        userEmail = users.data[0].emailAddresses[0]?.emailAddress;
      } else {
        const users = await this.clerkClient.users.getUserList({ limit: 1 });
        if (users.data.length === 0) {
          throw new NotFoundException(
            'No users found in Clerk instance. Please create a user first.',
          );
        }
        userId = users.data[0].id;
        userEmail = users.data[0].emailAddresses[0]?.emailAddress;
      }

      const session = await this.clerkClient.sessions.createSession({ userId });
      const tokenObj = await this.clerkClient.sessions.getToken(session.id);

      return {
        token: tokenObj.jwt,
        email: userEmail,
        userId: userId,
      };
    } catch (error) {
      this.logger.error('Clerk User Token Generation Failed', error);
      throw error;
    }
  }
}
