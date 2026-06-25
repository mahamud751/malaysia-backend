import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';

@Module({
  controllers: [CountriesController],
  providers: [CountriesService, RolesGuard],
  exports: [CountriesService],
})
export class CountriesModule {}
