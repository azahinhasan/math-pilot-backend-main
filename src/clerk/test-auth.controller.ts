import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { TokenGeneratorService } from './token-generator.service';

@Controller('test-auth')
export class TestAuthController {
  constructor(private readonly tokenGeneratorService: TokenGeneratorService) {}

  @Get('token')
  async getTestToken(@Query('email') email?: string) {
    const result = await this.tokenGeneratorService.generateUserToken(email);

    return {
      token: result.token,
      user: {
        email: result.email,
        id: result.userId,
      },
      message:
        'Use this token in the Authorization: Bearer <token> header for testing protected routes.',
    };
  }

  @Post('delete-user')
  async deleteUser(@Body('email') email: string) {
    const result = await this.tokenGeneratorService.deleteUser(email);

    return {
      message: `User deleted successfully. Please register again.`,
      userId: result.userId,
    };
  }
}
