import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdatePropertyApprovalDto {
  @ApiProperty({ enum: ['PENDING', 'ACTIVE', 'REJECTED'] })
  @IsIn(['PENDING', 'ACTIVE', 'REJECTED'])
  approvalStatus: 'PENDING' | 'ACTIVE' | 'REJECTED';
}
