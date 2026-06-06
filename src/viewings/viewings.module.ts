import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { ViewingsController } from './viewings.controller';
import { ViewingsService } from './viewings.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ViewingsController],
  providers: [ViewingsService, RolesGuard],
})
export class ViewingsModule {}
