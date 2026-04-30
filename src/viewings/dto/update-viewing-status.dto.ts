import { ApiProperty } from '@nestjs/swagger';
import { ViewingStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateViewingStatusDto {
  @ApiProperty({ enum: ViewingStatus })
  @IsEnum(ViewingStatus)
  status: ViewingStatus;
}
