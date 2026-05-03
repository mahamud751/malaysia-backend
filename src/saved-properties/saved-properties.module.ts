import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { SavedPropertiesController } from './saved-properties.controller';
import { SavedPropertiesService } from './saved-properties.service';

@Module({
  controllers: [SavedPropertiesController],
  providers: [SavedPropertiesService, RolesGuard],
})
export class SavedPropertiesModule {}
