import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateViewingDto } from './dto/create-viewing.dto';
import { UpdateViewingNoteDto } from './dto/update-viewing-note.dto';
import { UpdateViewingStatusDto } from './dto/update-viewing-status.dto';
import { ViewingsService } from './viewings.service';

@ApiTags('viewings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('viewings')
export class ViewingsController {
  constructor(private readonly viewingsService: ViewingsService) {}

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all viewings (admin only)' })
  findAllForAdmin() {
    return this.viewingsService.findAllForAdmin();
  }

  @Get('me')
  findMy(@CurrentUser() user: { id: string }) {
    return this.viewingsService.findMy(user.id);
  }

  @Get('owner/all')
  @ApiOperation({ summary: 'List all viewings for properties owned by current user' })
  findAllForOwner(@CurrentUser() user: { id: string }) {
    return this.viewingsService.findAllForOwner(user.id);
  }

  @Get('agent/all')
  @ApiOperation({ summary: 'Alias of owner viewings list for agent app clients' })
  findAllForAgent(@CurrentUser() user: { id: string }) {
    return this.viewingsService.findAllForOwner(user.id);
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateViewingDto) {
    return this.viewingsService.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single viewing (client or listing owner)' })
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.viewingsService.findOne(id, user.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateViewingStatusDto,
  ) {
    return this.viewingsService.updateStatus(id, user.id, dto);
  }

  @Patch(':id/note')
  updateNote(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateViewingNoteDto,
  ) {
    return this.viewingsService.updateNote(id, user.id, dto);
  }
}
