import { Injectable, Inject, Logger } from '@nestjs/common';
import type { ClerkClient } from '@clerk/backend';
import { CLERK_CLIENT } from './clerk.provider';

@Injectable()
export class TokenGeneratorService {
  private readonly logger = new Logger(TokenGeneratorService.name);

  constructor(
    @Inject(CLERK_CLIENT) private readonly clerkClient: ClerkClient,
  ) {}

  async generateM2MToken(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    secondsUntilExpiration: number = 3600,
  ): Promise<string> {
    try {
      // Note: createTestingToken does not support custom expiration or claims via the SDK currently.
      // It generates a token suitable for testing.
      const testingToken =
        await this.clerkClient.testingTokens.createTestingToken();

      if (!testingToken.token) {
        throw new Error(
          'Token generation response did not contain a token string.',
        );
      }
      return testingToken.token;
    } catch (error) {
      this.logger.error('Clerk Testing Token Generation Failed', error);
      throw new Error('Failed to generate Clerk testing token.');
    }
  }
}
