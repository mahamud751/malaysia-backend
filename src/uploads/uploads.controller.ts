import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('presign')
  createUploadUrl(@CurrentUser() user: { id: string }, @Body() dto: CreateUploadUrlDto) {
    return this.uploadsService.createUploadUrl(user.id, dto);
  }
}

