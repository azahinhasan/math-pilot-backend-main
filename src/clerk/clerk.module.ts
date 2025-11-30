import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClerkClientProvider } from './clerk.provider';
import { TokenGeneratorService } from './token-generator.service';
import { TestAuthController } from './test-auth.controller';

@Module({
  imports: [ConfigModule],
  controllers: [TestAuthController],
  providers: [ClerkClientProvider, TokenGeneratorService],
  exports: [TokenGeneratorService, ClerkClientProvider],
})
export class ClerkModule {}
