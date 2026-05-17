import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';

@Module({
  controllers: [AreasController],
  providers: [AreasService, RolesGuard],
  exports: [AreasService],
})
export class AreasModule {}
