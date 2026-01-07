import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    // Initialize S3 Client
    const region = this.configService.get<string>('AWS_REGION');
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    // Validate required configuration
    if (!region || !bucketName || !accessKeyId || !secretAccessKey) {
      const missing: string[] = [];
      if (!region) missing.push('AWS_REGION');
      if (!bucketName) missing.push('AWS_S3_BUCKET');
      if (!accessKeyId) missing.push('AWS_ACCESS_KEY_ID');
      if (!secretAccessKey) missing.push('AWS_SECRET_ACCESS_KEY');
      
      throw new Error(
        `Missing required AWS configuration: ${missing.join(', ')}. Please check your .env file.`
      );
    }

    this.region = region;
    this.bucketName = bucketName;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(`S3 Client initialized for bucket: ${this.bucketName}`);
  }

  /**
   * Upload a single image to S3
   */
  async uploadImage(file: Express.Multer.File): Promise<{ url: string; key: string }> {
    this.logger.log('=== IMAGE UPLOAD START ===');
    
    try {
      // Validate file
      if (!file || !file.buffer) {
        throw new BadRequestException('No file provided');
      }

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
        );
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new BadRequestException('File size exceeds 10MB limit');
      }

      // Generate unique key for S3
      const fileExtension = file.originalname.split('.').pop();
      const key = `uploads/${Date.now()}-${randomUUID()}.${fileExtension}`;

      this.logger.log(`Uploading file: ${file.originalname} (${file.size} bytes)`);
      this.logger.log(`S3 Key: ${key}`);

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Make the file publicly accessible (optional - adjust based on your needs)
        // ACL: 'public-read',
      });

      await this.s3Client.send(command);

      // Construct URL
      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

      this.logger.log(`✅ File uploaded successfully: ${url}`);
      this.logger.log('=== IMAGE UPLOAD END ===');

      return { url, key };
    } catch (error) {
      this.logger.error('❌ Image upload error:', error.message);
      
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to upload image: ${error.message}`,
      );
    }
  }

  /**
   * Upload multiple images to S3
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
  ): Promise<Array<{ url: string; key: string; originalName: string }>> {
    this.logger.log(`=== MULTIPLE IMAGE UPLOAD START (${files.length} files) ===`);

    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('No files provided');
      }

      // Validate max number of files
      if (files.length > 10) {
        throw new BadRequestException('Maximum 10 files allowed per upload');
      }

      const uploadPromises = files.map((file) => this.uploadImage(file));
      const results = await Promise.all(uploadPromises);

      const response = results.map((result, index) => ({
        ...result,
        originalName: files[index].originalname,
      }));

      this.logger.log(`✅ All ${files.length} files uploaded successfully`);
      this.logger.log('=== MULTIPLE IMAGE UPLOAD END ===');

      return response;
    } catch (error) {
      this.logger.error('❌ Multiple image upload error:', error.message);
      throw error;
    }
  }

  /**
   * Delete an image from S3
   */
  async deleteImage(key: string): Promise<void> {
    this.logger.log(`Deleting image from S3: ${key}`);

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`✅ Image deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`❌ Error deleting image: ${error.message}`);
      throw new InternalServerErrorException(
        `Failed to delete image: ${error.message}`,
      );
    }
  }

  /**
   * Delete multiple images from S3
   */
  async deleteMultipleImages(keys: string[]): Promise<void> {
    this.logger.log(`Deleting ${keys.length} images from S3`);

    try {
      const deletePromises = keys.map((key) => this.deleteImage(key));
      await Promise.all(deletePromises);

      this.logger.log(`✅ All ${keys.length} images deleted successfully`);
    } catch (error) {
      this.logger.error(`❌ Error deleting multiple images: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get signed URL for private S3 object (if needed)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // Implementation for signed URLs if you need private files
    // This requires @aws-sdk/s3-request-presigner package
    this.logger.log(`Generating signed URL for: ${key}`);
    
    // For now, return public URL
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Get public URL for an S3 object
   * Returns the public URL that can be accessed via HTTP
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

