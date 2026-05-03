import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

/** Home tab labels → keywords matched against `propertyType` (case-insensitive contains). */
const HOME_CATEGORY_KEYWORDS: Record<string, string[]> = {
  Residence: ['residence', 'residential', 'condo', 'house'],
  Apartment: ['apartment'],
  Villa: ['villa'],
  Investment: ['investment', 'commercial'],
};

type FindPropertiesQuery = {
  q?: string;
  /** Single-type filter (search/filters UI); ignored when `category` is set. */
  propertyType?: string;
  /** Home screen tab: Residence | Apartment | Villa | Investment */
  category?: string;
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
    const {
      q,
      propertyType,
      category,
      city,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
    } = query;

    const and: Prisma.PropertyWhereInput[] = [{ isActive: true }];

    const categoryKey = category?.trim();
    if (categoryKey && HOME_CATEGORY_KEYWORDS[categoryKey]?.length) {
      const keywords = HOME_CATEGORY_KEYWORDS[categoryKey];
      and.push({
        OR: keywords.map((k) => ({
          propertyType: { contains: k, mode: 'insensitive' },
        })),
      });
    } else if (propertyType && propertyType !== 'All') {
      and.push({
        propertyType: { contains: propertyType, mode: 'insensitive' },
      });
    }

    if (city) {
      and.push({ city: { contains: city, mode: 'insensitive' } });
    }
    if (typeof bedrooms === 'number' && Number.isFinite(bedrooms)) {
      and.push({ bedrooms: { gte: bedrooms } });
    }
    if (typeof bathrooms === 'number' && Number.isFinite(bathrooms)) {
      and.push({ bathrooms: { gte: bathrooms } });
    }
    if (
      (typeof minPrice === 'number' && Number.isFinite(minPrice)) ||
      (typeof maxPrice === 'number' && Number.isFinite(maxPrice))
    ) {
      const priceFilter: Prisma.DecimalFilter = {};
      if (typeof minPrice === 'number' && Number.isFinite(minPrice)) {
        priceFilter.gte = minPrice;
      }
      if (typeof maxPrice === 'number' && Number.isFinite(maxPrice)) {
        priceFilter.lte = maxPrice;
      }
      and.push({ price: priceFilter });
    }
    if (q) {
      and.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { address: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    return this.prisma.property.findMany({
      where: { AND: and },
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
