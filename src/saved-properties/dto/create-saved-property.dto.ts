import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateSavedPropertyDto {
  @ApiProperty()
  @IsString()
  propertyId: string;
}
