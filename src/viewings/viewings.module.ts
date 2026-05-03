import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { ViewingsController } from './viewings.controller';
import { ViewingsService } from './viewings.service';

@Module({
  controllers: [ViewingsController],
  providers: [ViewingsService, RolesGuard],
})
export class ViewingsModule {}
