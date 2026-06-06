import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ChatGateway } from './chat.gateway';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [ChatsController],
  providers: [ChatsService, ChatGateway, RolesGuard],
  exports: [ChatsService],
})
export class ChatsModule {}
