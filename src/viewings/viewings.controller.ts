import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateViewingDto } from './dto/create-viewing.dto';
import { UpdateViewingStatusDto } from './dto/update-viewing-status.dto';
import { ViewingsService } from './viewings.service';

@ApiTags('viewings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('viewings')
export class ViewingsController {
  constructor(private readonly viewingsService: ViewingsService) {}

  @Get('me')
  findMy(@CurrentUser() user: { id: string }) {
    return this.viewingsService.findMy(user.id);
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateViewingDto) {
    return this.viewingsService.create(user.id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateViewingStatusDto,
  ) {
    return this.viewingsService.updateStatus(id, user.id, dto);
  }
}
