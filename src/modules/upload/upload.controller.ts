import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { ClerkAuthGuard } from '../../clerk-auth-guard';
import { DeleteFileDto, DeleteMultipleFilesDto } from './dto/delete-file.dto';
import { UploadSuccessResponseDto } from './dto/upload-response.dto';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /upload/image
   * Upload a single image
   * Protected by ClerkAuthGuard
   */
  @Post('image')
  @UseGuards(ClerkAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadSuccessResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadService.uploadImage(file);

    return {
      status: 'success',
      message: 'Image uploaded successfully',
      data: result,
    };
  }

  /**
   * POST /upload/images
   * Upload multiple images (max 10)
   * Protected by ClerkAuthGuard
   */
  @Post('images')
  @UseGuards(ClerkAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadMultipleImages(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<UploadSuccessResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const results = await this.uploadService.uploadMultipleImages(files);

    return {
      status: 'success',
      message: `${results.length} images uploaded successfully`,
      data: results,
    };
  }

  /**
   * DELETE /upload/image
   * Delete a single image from S3
   * Protected by ClerkAuthGuard
   */
  @Delete('image')
  @UseGuards(ClerkAuthGuard)
  async deleteImage(@Body() dto: DeleteFileDto) {
    await this.uploadService.deleteImage(dto.key);

    return {
      status: 'success',
      message: 'Image deleted successfully',
    };
  }

  /**
   * DELETE /upload/images
   * Delete multiple images from S3
   * Protected by ClerkAuthGuard
   */
  @Delete('images')
  @UseGuards(ClerkAuthGuard)
  async deleteMultipleImages(@Body() dto: DeleteMultipleFilesDto) {
    await this.uploadService.deleteMultipleImages(dto.keys);

    return {
      status: 'success',
      message: `${dto.keys.length} images deleted successfully`,
    };
  }

  /**
   * POST /upload/test
   * Test endpoint without authentication for testing purposes
   * WARNING: Remove this in production or add proper authentication
   */
  @Post('test')
  @UseInterceptors(FileInterceptor('file'))
  async testUpload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadSuccessResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadService.uploadImage(file);

    return {
      status: 'success',
      message: 'Test image uploaded successfully',
      data: result,
    };
  }
}

