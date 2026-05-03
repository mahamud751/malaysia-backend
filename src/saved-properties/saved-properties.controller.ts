import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateSavedPropertyDto } from './dto/create-saved-property.dto';
import { SavedPropertiesService } from './saved-properties.service';

@ApiTags('saved-properties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('saved-properties')
export class SavedPropertiesController {
  constructor(private readonly savedPropertiesService: SavedPropertiesService) {}

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'All users’ saved properties (admin)' })
  findAllForAdmin() {
    return this.savedPropertiesService.findAllForAdmin();
  }

  @Get('me')
  @ApiOperation({ summary: 'Current user’s saved list' })
  findMine(@CurrentUser() user: { id: string }) {
    return this.savedPropertiesService.findMine(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Save a property (idempotent)' })
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSavedPropertyDto,
  ) {
    return this.savedPropertiesService.createIdempotent(user.id, dto);
  }

  @Delete(':propertyId')
  @ApiOperation({ summary: 'Unsave a property (idempotent)' })
  remove(
    @CurrentUser() user: { id: string },
    @Param('propertyId') propertyId: string,
  ) {
    return this.savedPropertiesService.removeIdempotent(user.id, propertyId);
  }
}
