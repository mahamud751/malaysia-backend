import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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

  @Get('threads/:threadId/messages')
  listMessages(
    @CurrentUser() user: { id: string },
    @Param('threadId') threadId: string,
  ) {
    return this.chatsService.listMessages(threadId, user.id);
  }

  @Get('threads/:threadId')
  getThread(
    @CurrentUser() user: { id: string },
    @Param('threadId') threadId: string,
  ) {
    return this.chatsService.getThreadContext(threadId, user.id);
  }
}
