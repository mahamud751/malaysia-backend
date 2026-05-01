import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';

type UploadKind = 'photo' | 'video' | 'pdf';

const MIME_WHITELIST: Record<UploadKind, string[]> = {
  photo: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  pdf: ['application/pdf'],
};

const MAX_SIZE_BYTES: Record<UploadKind, number> = {
  photo: 15 * 1024 * 1024,
  video: 300 * 1024 * 1024,
  pdf: 12 * 1024 * 1024,
};

@Injectable()
export class UploadsService {
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly s3Client: S3Client;
  private readonly allowedTypes: Record<UploadKind, string[]>;
  private readonly maxUploadBytes: number;

  constructor(private readonly configService: ConfigService) {
    const accountId =
      this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID') ??
      this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId =
      this.configService.get<string>('CLOUDFLARE_ACCESS_KEY_ID') ??
      this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey =
      this.configService.get<string>('CLOUDFLARE_SECRET_ACCESS_KEY') ??
      this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket =
      this.configService.get<string>('CLOUDFLARE_BUCKET_NAME') ??
      this.configService.get<string>('R2_BUCKET') ??
      '';
    this.publicBaseUrl =
      this.configService.get<string>('CLOUDFLARE_PUBLIC_URL') ??
      this.configService.get<string>('R2_PUBLIC_BASE_URL') ??
      '';

    const imageTypes = this.parseList(
      this.configService.get<string>('ALLOWED_IMAGE_TYPES'),
      MIME_WHITELIST.photo,
    );
    const videoTypes = this.parseList(
      this.configService.get<string>('ALLOWED_VIDEO_TYPES'),
      MIME_WHITELIST.video,
    );
    const pdfTypes = this.parseList(
      this.configService.get<string>('ALLOWED_PDF_TYPES'),
      MIME_WHITELIST.pdf,
    );
    this.allowedTypes = {
      photo: imageTypes,
      video: videoTypes,
      pdf: pdfTypes,
    };
    this.maxUploadBytes = Number(this.configService.get<string>('MAX_FILE_SIZE') ?? 524288000);

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
      throw new InternalServerErrorException(
        'Cloudflare R2 is not configured. Missing CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ACCESS_KEY_ID, CLOUDFLARE_SECRET_ACCESS_KEY, or CLOUDFLARE_BUCKET_NAME.',
      );
    }

    const endpoint =
      this.configService.get<string>('R2_ENDPOINT') ??
      `https://${accountId}.r2.cloudflarestorage.com`;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async createUploadUrl(userId: string, dto: CreateUploadUrlDto) {
    const cleanFileName = dto.fileName.trim();
    const fileType = dto.fileType.trim().toLowerCase();
    const kind = dto.kind;

    if (!cleanFileName) {
      throw new BadRequestException('fileName is required');
    }

    if (!this.allowedTypes[kind].includes(fileType)) {
      throw new BadRequestException(
        `Unsupported fileType for ${kind}. Allowed: ${this.allowedTypes[kind].join(', ')}`,
      );
    }

    const kindMaxSize = Math.min(MAX_SIZE_BYTES[kind], this.maxUploadBytes);
    if (dto.sizeBytes && dto.sizeBytes > kindMaxSize) {
      throw new BadRequestException(
        `${kind} exceeds max upload size (${kindMaxSize} bytes).`,
      );
    }

    const safeExt = extname(cleanFileName).replace(/[^a-zA-Z0-9.]/g, '') || '';
    const key = `${kind}s/${userId}/${Date.now()}-${randomUUID()}${safeExt}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: fileType,
    });

    const defaultExpiry = this.configService.get<number>('R2_SIGNED_URL_EXPIRES_SECONDS') ?? 300;
    const expiresIn = dto.expiresInSeconds ?? defaultExpiry;

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn,
    });

    const fileUrl = this.publicBaseUrl
      ? `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`
      : key;

    return {
      key,
      fileUrl,
      uploadUrl,
      expiresIn,
      contentType: fileType,
      kind,
    };
  }

  private parseList(value: string | undefined, fallback: string[]) {
    if (!value?.trim()) {
      return fallback;
    }
    return value
      .split(',')
      .map(item => item.trim().toLowerCase())
      .filter(Boolean);
  }
}

