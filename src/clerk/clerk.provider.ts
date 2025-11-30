import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';

export const CLERK_CLIENT = 'CLERK_CLIENT';

export const ClerkClientProvider = {
  provide: CLERK_CLIENT,
  useFactory: (configService: ConfigService) => {
    const secretKey = configService.get<string>('CLERK_SECRET_KEY');

    if (!secretKey) {
      throw new Error(
        'CLERK_SECRET_KEY is not defined in environment variables.',
      );
    }

    return createClerkClient({
      secretKey: secretKey,
    });
  },
  inject: [ConfigService],
};
