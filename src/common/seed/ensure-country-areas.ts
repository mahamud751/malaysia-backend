import { PrismaClient } from '@prisma/client';
import { AREAS_BY_COUNTRY } from './areas-by-country';

/** Idempotent upsert of default areas for every active country. */
export async function ensureCountryAreas(prisma: PrismaClient) {
  const countries = await prisma.country.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  let count = 0;
  for (const country of countries) {
    const rows = AREAS_BY_COUNTRY[country.code] || [];
    for (const row of rows) {
      await prisma.area.upsert({
        where: {
          countryId_name: { countryId: country.id, name: row.name },
        },
        create: {
          name: row.name,
          countryId: country.id,
          sortOrder: row.sortOrder,
          isActive: true,
        },
        update: { sortOrder: row.sortOrder, isActive: true },
      });
      count += 1;
    }
  }

  return { countries: countries.length, areas: count };
}
