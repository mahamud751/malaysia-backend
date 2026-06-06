import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [NotificationsModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, RolesGuard],
})
export class PropertiesModule {}
