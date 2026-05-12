import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ChatsService } from './chats.service';

@ApiTags('chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  /** Start or resume a 1:1 chat about a property (buyer ↔ listing owner). */
  @Post('property/:propertyId/join')
  joinPropertyThread(
    @CurrentUser() user: { id: string },
    @Param('propertyId') propertyId: string,
  ) {
    return this.chatsService.joinOrCreatePropertyThread(user.id, propertyId);
  }

  @Get('my-threads')
  listMyThreads(@CurrentUser() user: { id: string }) {
    return this.chatsService.listMyThreads(user.id);
  }

  @Get('admin/all-threads')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'All chat threads across users (admin only)' })
  listAllThreadsForAdmin() {
    return this.chatsService.listAllThreadsForAdmin();
  }

  @Post('admin/open-with/:participantId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Open or resume admin direct chat with a user or agent' })
  adminOpenWith(
    @CurrentUser() user: { id: string },
    @Param('participantId') participantId: string,
  ) {
    return this.chatsService.adminOpenThreadWith(user.id, participantId);
  }

  @Get('threads/:threadId/messages')
  listMessages(
    @CurrentUser() user: { id: string; role?: string },
    @Param('threadId') threadId: string,
  ) {
    return this.chatsService.listMessages(threadId, user.id, user.role);
  }

  @Post('threads/:threadId/messages')
  sendMessageHttp(
    @CurrentUser() user: { id: string },
    @Param('threadId') threadId: string,
    @Body() body: { body: string; messageType?: string },
  ) {
    return this.chatsService.createMessage(threadId, user.id, {
      body: body?.body ?? '',
      messageType: (body?.messageType as 'text') || 'text',
    });
  }

  @Get('threads/:threadId')
  getThread(
    @CurrentUser() user: { id: string; role?: string },
    @Param('threadId') threadId: string,
  ) {
    return this.chatsService.getThreadContext(threadId, user.id, user.role);
  }
}
