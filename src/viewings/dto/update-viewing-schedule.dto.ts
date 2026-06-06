import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class UpdateViewingScheduleDto {
  @ApiProperty({ example: '2026-06-10T11:00:00.000Z' })
  @IsDateString()
  scheduledAt: string;
}
