import { Controller, Get } from '@nestjs/common';
import { TokenGeneratorService } from './token-generator.service';

@Controller('test-auth')
export class TestAuthController {
  constructor(private readonly tokenGeneratorService: TokenGeneratorService) {}

  @Get('token')
  async getTestToken() {
    const token = await this.tokenGeneratorService.generateM2MToken(3600);

    return {
      token: token,
      message:
        'Use this token in the Authorization: Bearer <token> header for testing protected routes.',
    };
  }
}
