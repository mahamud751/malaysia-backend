import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(activeOnly = true, countryId?: string) {
    return this.prisma.area.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(countryId ? { countryId } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        country: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  findOne(id: string) {
    return this.prisma.area.findUnique({
      where: { id },
      include: {
        country: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async create(dto: CreateAreaDto) {
    const name = dto.name.trim();
    const country = await this.prisma.country.findUnique({
      where: { id: dto.countryId },
    });
    if (!country) {
      throw new NotFoundException('Country not found');
    }
    const existing = await this.prisma.area.findFirst({
      where: {
        countryId: dto.countryId,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw new ConflictException('An area with this name already exists in this country');
    }
    const maxSort = await this.prisma.area.aggregate({
      where: { countryId: dto.countryId },
      _max: { sortOrder: true },
    });
    return this.prisma.area.create({
      data: {
        name,
        countryId: dto.countryId,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
      include: {
        country: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async update(id: string, dto: UpdateAreaDto) {
    const existing = await this.prisma.area.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Area not found');
    }
    if (dto.name?.trim()) {
      const name = dto.name.trim();
      const duplicate = await this.prisma.area.findFirst({
        where: {
          id: { not: id },
          countryId: existing.countryId,
          name: { equals: name, mode: 'insensitive' },
        },
      });
      if (duplicate) {
        throw new ConflictException('An area with this name already exists in this country');
      }
    }
    return this.prisma.area.update({
      where: { id },
      data: {
        ...(dto.name != null ? { name: dto.name.trim() } : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
        ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
      },
      include: {
        country: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.area.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Area not found');
    }
    await this.prisma.area.delete({ where: { id } });
    return { ok: true };
  }
}
