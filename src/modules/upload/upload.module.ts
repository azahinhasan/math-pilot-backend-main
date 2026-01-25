import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { ClerkModule } from 'src/clerk/clerk.module';

@Module({
  imports: [ConfigModule, ClerkModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService], // Export service so other modules can use it
})
export class UploadModule {}
