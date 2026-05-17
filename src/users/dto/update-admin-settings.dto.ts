import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class SettingItemDto {
  @IsString()
  key: string;

  @IsString()
  label: string;

  @IsOptional()
  checked?: boolean;

  @IsOptional()
  enabled?: boolean;
}

export class UpdateAdminSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  monthlyFeeGbp?: number;

  @ApiPropertyOptional({ type: [SettingItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  platform?: SettingItemDto[];

  @ApiPropertyOptional({ type: [SettingItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  features?: SettingItemDto[];
}

export class PromoteAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
}

export class SetUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

export class DemoteAdminDto {
  @IsString()
  userId: string;
}
