import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

type FindPropertiesQuery = {
  q?: string;
  propertyType?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
};

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: FindPropertiesQuery = {}) {
    const { q, propertyType, city, minPrice, maxPrice, bedrooms, bathrooms } = query;
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (propertyType && propertyType !== 'All') {
      where.propertyType = { contains: propertyType, mode: 'insensitive' };
    }
    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }
    if (typeof bedrooms === 'number' && Number.isFinite(bedrooms)) {
      where.bedrooms = { gte: bedrooms };
    }
    if (typeof bathrooms === 'number' && Number.isFinite(bathrooms)) {
      where.bathrooms = { gte: bathrooms };
    }
    if (
      (typeof minPrice === 'number' && Number.isFinite(minPrice)) ||
      (typeof maxPrice === 'number' && Number.isFinite(maxPrice))
    ) {
      where.price = {};
      if (typeof minPrice === 'number' && Number.isFinite(minPrice)) {
        (where.price as Record<string, number>).gte = minPrice;
      }
      if (typeof maxPrice === 'number' && Number.isFinite(maxPrice)) {
        (where.price as Record<string, number>).lte = maxPrice;
      }
    }
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.property.findMany({
      where,
      include: {
        owner: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  create(ownerId: string, dto: CreatePropertyDto) {
    return this.prisma.property.create({
      data: {
        ...dto,
        price: Number(dto.price),
        ownerId,
      },
    });
  }

  async update(id: string, ownerId: string, dto: UpdatePropertyDto) {
    const existing = await this.prisma.property.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Property not found');
    }
    if (existing.ownerId !== ownerId) {
      throw new ForbiddenException('You can only update your own property');
    }

    return this.prisma.property.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.price !== undefined ? { price: Number(dto.price) } : {}),
      },
    });
  }
}
