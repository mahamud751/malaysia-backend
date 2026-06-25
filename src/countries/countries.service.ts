import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CountriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(activeOnly = true) {
    return this.prisma.country.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findOne(id: string) {
    return this.prisma.country.findUnique({ where: { id } });
  }

  async create(dto: CreateCountryDto) {
    const name = dto.name.trim();
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.country.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { code: { equals: code, mode: 'insensitive' } },
        ],
      },
    });
    if (existing) {
      throw new ConflictException('A country with this name or code already exists');
    }
    const maxSort = await this.prisma.country.aggregate({
      _max: { sortOrder: true },
    });
    return this.prisma.country.create({
      data: {
        name,
        code,
        subtitle: dto.subtitle?.trim() || `Discover properties in ${name}`,
        imageUrl: dto.imageUrl?.trim() || null,
        defaultCurrency: dto.defaultCurrency?.trim() || 'GBP',
        mapLatitude: dto.mapLatitude ?? null,
        mapLongitude: dto.mapLongitude ?? null,
        mapZoom: dto.mapZoom ?? 10,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async update(id: string, dto: UpdateCountryDto) {
    const existing = await this.prisma.country.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Country not found');
    }
    if (dto.name?.trim() || dto.code?.trim()) {
      const name = dto.name?.trim() || existing.name;
      const code = (dto.code?.trim() || existing.code).toUpperCase();
      const duplicate = await this.prisma.country.findFirst({
        where: {
          id: { not: id },
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            { code: { equals: code, mode: 'insensitive' } },
          ],
        },
      });
      if (duplicate) {
        throw new ConflictException('A country with this name or code already exists');
      }
    }
    return this.prisma.country.update({
      where: { id },
      data: {
        ...(dto.name != null ? { name: dto.name.trim() } : {}),
        ...(dto.code != null ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.subtitle != null ? { subtitle: dto.subtitle.trim() } : {}),
        ...(dto.imageUrl != null ? { imageUrl: dto.imageUrl.trim() || null } : {}),
        ...(dto.defaultCurrency != null
          ? { defaultCurrency: dto.defaultCurrency.trim() }
          : {}),
        ...(dto.mapLatitude != null ? { mapLatitude: dto.mapLatitude } : {}),
        ...(dto.mapLongitude != null ? { mapLongitude: dto.mapLongitude } : {}),
        ...(dto.mapZoom != null ? { mapZoom: dto.mapZoom } : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
        ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.country.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Country not found');
    }
    const propertyCount = await this.prisma.property.count({
      where: { countryId: id },
    });
    if (propertyCount > 0) {
      await this.prisma.country.update({
        where: { id },
        data: { isActive: false },
      });
      return { ok: true, deactivated: true };
    }
    await this.prisma.country.delete({ where: { id } });
    return { ok: true };
  }
}
