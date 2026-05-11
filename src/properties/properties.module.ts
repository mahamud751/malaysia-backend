import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  controllers: [PropertiesController],
  providers: [PropertiesService, RolesGuard],
})
export class PropertiesModule {}
