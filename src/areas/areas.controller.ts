import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@ApiTags('areas')
@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Get()
  @ApiOperation({ summary: 'List areas (active only by default)' })
  findAll(@Query('all') all?: string) {
    const includeInactive = all === '1' || all === 'true';
    return this.areasService.findAll(!includeInactive);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  @ApiOperation({ summary: 'List all areas including inactive (admin)' })
  findAllAdmin() {
    return this.areasService.findAll(false);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.areasService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateAreaDto) {
    return this.areasService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAreaDto) {
    return this.areasService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.areasService.remove(id);
  }
}
