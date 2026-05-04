import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateUploadUrlDto {
  @ApiProperty({ enum: ['photo', 'video', 'pdf', 'audio', 'document'] })
  @IsIn(['photo', 'video', 'pdf', 'audio', 'document'])
  kind: 'photo' | 'video' | 'pdf' | 'audio' | 'document';

  @ApiProperty()
  @IsString()
  fileName: string;

  @ApiProperty()
  @IsString()
  fileType: string;

  @ApiPropertyOptional({ default: 300, description: 'Signed URL expiry in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(3600)
  expiresInSeconds?: number;

  @ApiPropertyOptional({ description: 'File size in bytes for server-side validation' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeBytes?: number;
}

