import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ensureCountryAreas } from '../seed/ensure-country-areas';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    try {
      const result = await ensureCountryAreas(this);
      this.logger.log(
        `Default areas ready (${result.areas} areas, ${result.countries} countries)`,
      );
    } catch (error) {
      this.logger.warn(
        `Area bootstrap skipped: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    (this as PrismaClient & { $on: (e: 'beforeExit', fn: () => void) => void }).$on(
      'beforeExit',
      () => {
        void app.close();
      },
    );
  }
}
