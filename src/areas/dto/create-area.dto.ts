import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateAreaDto {
  @ApiProperty({ example: 'Mont Kiara' })
  @IsString()
  @MinLength(1)
  name: string;
}
