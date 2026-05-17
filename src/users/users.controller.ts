import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import {
  DemoteAdminDto,
  PromoteAdminDto,
  SetUserRoleDto,
  UpdateAdminSettingsDto,
} from './dto/update-admin-settings.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  findMe(@CurrentUser() user: { id: string }) {
    return this.usersService.findOne(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user.id, dto);
  }

  @Get('admin/dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin home dashboard metrics and feeds' })
  getAdminDashboard(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.usersService.getAdminDashboard(days);
  }

  @Get('admin/agents')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Paginated agents with property and viewing counts (admin only)' })
  findAgentsForAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('q') q?: string,
    @Query('filter') filter?: string,
  ) {
    return this.usersService.findAgentsForAdmin(page, pageSize, q, filter);
  }

  @Get('admin/peers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Directory of users and agents for admin messaging (admin only)' })
  findPeersForAdmin(@Query('q') q?: string) {
    return this.usersService.findPeersForAdmin(q);
  }

  @Get('admin/settings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Platform settings and subscription fee' })
  getAdminSettings() {
    return this.usersService.getAdminSettings();
  }

  @Patch('admin/settings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateAdminSettings(@Body() dto: UpdateAdminSettingsDto) {
    return this.usersService.updateAdminSettings(dto);
  }

  @Get('admin/admins')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List administrator accounts' })
  listAdmins() {
    return this.usersService.listAdmins();
  }

  @Get('admin/role-candidates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Search users/agents to promote to admin' })
  searchRoleCandidates(@Query('q') q?: string) {
    return this.usersService.searchRoleCandidates(q);
  }

  @Post('admin/promote')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Promote a user or agent to admin' })
  promoteToAdmin(
    @CurrentUser() user: { id: string },
    @Body() dto: PromoteAdminDto,
  ) {
    return this.usersService.promoteToAdmin(user.id, dto);
  }

  @Post('admin/demote')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove admin access (demote to user)' })
  demoteAdmin(
    @CurrentUser() user: { id: string },
    @Body() dto: DemoteAdminDto,
  ) {
    return this.usersService.demoteAdmin(user.id, dto.userId);
  }

  @Patch('admin/:id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Change a user role (admin only)' })
  setUserRole(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: SetUserRoleDto,
  ) {
    return this.usersService.setUserRole(user.id, id, dto.role);
  }

  @Post('admin/create')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new admin account' })
  createAdmin(@Body() dto: CreateUserDto) {
    return this.usersService.create({ ...dto, role: UserRole.ADMIN });
  }

  @Get(':id/profile-insights')
  @ApiOperation({
    summary: 'Profile stats, listings, and reviews for agent or user profiles',
  })
  getProfileInsights(@Param('id') id: string) {
    return this.usersService.getProfileInsights(id);
  }

  @Get(':id/agent-analytics')
  @ApiOperation({ summary: 'Agent dashboard analytics for a date range' })
  getAgentAnalytics(
    @Param('id') id: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.usersService.getAgentAnalytics(id, days);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}
