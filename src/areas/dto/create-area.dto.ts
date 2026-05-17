import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateAreaDto {
  @ApiProperty({ example: 'Mirpur 10' })
  @IsString()
  @MinLength(1)
  name: string;
}
