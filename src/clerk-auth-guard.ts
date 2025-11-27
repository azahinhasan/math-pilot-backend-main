import clerkClient from '@clerk/clerk-sdk-node';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger();
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Attempt to get token from session cookie or Authorization header
    let token = request.cookies.__session;

    if (!token) {
      const authHeader = request.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) return false;

    // Verify the retrieved token, and log errors if verification fails
    try {
      const claims = await clerkClient.verifyToken(token);
      request.user = claims;
    } catch (err) {
      this.logger.error(err);
      return false;
    }

    // Return true if everything worked out as expected
    return true;
  }
}
