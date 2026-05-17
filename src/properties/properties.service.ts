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
  areaId?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  /** e.g. FOR_SALE */
  status?: string;
  /** latest | price_asc | price_desc */
  sort?: string;
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
      areaId,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      status,
      sort,
    } = query;

    const and: Prisma.PropertyWhereInput[] = [
      { isActive: true },
      { approvalStatus: 'ACTIVE' },
    ];

    const categoryKey = category?.trim();
    if (categoryKey && HOME_CATEGORY_KEYWORDS[categoryKey]?.length) {
      const keywords = HOME_CATEGORY_KEYWORDS[categoryKey];
      and.push({
        OR: keywords.map((k) => ({
          propertyType: { contains: k, mode: 'insensitive' },
        })),
      });
    }

    if (propertyType && propertyType !== 'All' && propertyType !== 'All Types') {
      and.push({
        propertyType: { contains: propertyType, mode: 'insensitive' },
      });
    }

    if (status) {
      const normalized = status.replace(/\s+/g, '_').toUpperCase();
      and.push({ status: normalized });
    }

    if (areaId) {
      and.push({ areaId });
    } else if (city) {
      and.push({
        OR: [
          { city: { contains: city, mode: 'insensitive' } },
          { area: { name: { contains: city, mode: 'insensitive' } } },
        ],
      });
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
          { area: { name: { contains: q, mode: 'insensitive' } } },
        ],
      });
    }

    const sortKey = (sort || 'latest').toLowerCase();
    const orderBy: Prisma.PropertyOrderByWithRelationInput =
      sortKey === 'price_asc'
        ? { price: 'asc' }
        : sortKey === 'price_desc'
          ? { price: 'desc' }
          : { createdAt: 'desc' };

    return this.prisma.property.findMany({
      where: { AND: and },
      include: {
        area: true,
        owner: {
          select: { id: true, fullName: true, email: true, profileImageUrl: true },
        },
      },
      orderBy,
    });
  }

  /** Recently listed active properties (newest first). */
  async findNew(limitRaw = 20, daysRaw = 30) {
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.min(50, Math.floor(limitRaw))
        : 20;
    const days =
      Number.isFinite(daysRaw) && daysRaw > 0
        ? Math.min(90, Math.floor(daysRaw))
        : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const baseInclude = {
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          profileImageUrl: true,
          agencyName: true,
        },
      },
    } as const;

    const recent = await this.prisma.property.findMany({
      where: {
        isActive: true,
        approvalStatus: 'ACTIVE',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: baseInclude,
    });

    if (recent.length >= limit) {
      return recent;
    }

    const latest = await this.prisma.property.findMany({
      where: {
        isActive: true,
        approvalStatus: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: baseInclude,
    });

    const seen = new Set(recent.map((p) => p.id));
    const merged = [...recent];
    for (const row of latest) {
      if (!seen.has(row.id)) {
        merged.push(row);
        seen.add(row.id);
      }
      if (merged.length >= limit) break;
    }
    return merged;
  }

  async findAllForAdmin(
    pageRaw: number,
    pageSizeRaw: number,
    q?: string,
    approvalStatus?: string,
  ) {
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const pageSize =
      Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
        ? Math.min(100, Math.floor(pageSizeRaw))
        : 10;
    const skip = (page - 1) * pageSize;

    const and: Prisma.PropertyWhereInput[] = [];
    const trimmed = q?.trim();
    if (trimmed) {
      and.push({
        OR: [
          { title: { contains: trimmed, mode: 'insensitive' } },
          { address: { contains: trimmed, mode: 'insensitive' } },
          { city: { contains: trimmed, mode: 'insensitive' } },
          { propertyType: { contains: trimmed, mode: 'insensitive' } },
        ],
      });
    }
    const statusKey = approvalStatus?.trim().toUpperCase();
    if (statusKey && statusKey !== 'ALL') {
      and.push({ approvalStatus: statusKey });
    }
    const where: Prisma.PropertyWhereInput = and.length ? { AND: and } : {};

    const [total, items] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profileImageUrl: true,
              agencyName: true,
            },
          },
        },
      }),
    ]);

    return { items, total, page, pageSize };
  }

  findMine(ownerId: string) {
    return this.prisma.property.findMany({
      where: { ownerId },
      include: {
        owner: {
          select: { id: true, fullName: true, email: true, profileImageUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByOwner(ownerId: string) {
    return this.prisma.property.findMany({
      where: {
        ownerId,
        isActive: true,
        approvalStatus: 'ACTIVE',
      },
      include: {
        owner: {
          select: { id: true, fullName: true, email: true, profileImageUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.property.findUnique({
      where: { id },
      include: {
        area: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImageUrl: true,
            phone: true,
          },
        },
      },
    });
  }

  private async resolveLocationFields(dto: CreatePropertyDto | UpdatePropertyDto) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.price !== undefined) {
      data.price = Number(dto.price);
    }
    if (dto.areaId) {
      const area = await this.prisma.area.findUnique({
        where: { id: dto.areaId },
      });
      if (area) {
        data.city = dto.city?.trim() || area.name;
      }
    }
    if (!data.city) {
      data.city = 'Malaysia';
    }
    return data;
  }

  async create(ownerId: string, dto: CreatePropertyDto) {
    const data = await this.resolveLocationFields(dto);
    return this.prisma.property.create({
      data: {
        ...(data as unknown as CreatePropertyDto),
        city: String(data.city || 'Malaysia'),
        price: Number(dto.price),
        ownerId,
        approvalStatus: 'PENDING',
      },
      include: { area: true },
    });
  }

  async update(
    id: string,
    user: { id: string; role?: string },
    dto: UpdatePropertyDto,
  ) {
    const existing = await this.prisma.property.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Property not found');
    }
    const isAdmin = user.role === 'ADMIN';
    if (existing.ownerId !== user.id && !isAdmin) {
      throw new ForbiddenException('You can only update your own property');
    }

    const resolved = await this.resolveLocationFields(dto);
    const nextData: Prisma.PropertyUpdateInput = {
      ...(resolved as Prisma.PropertyUpdateInput),
      ...(dto.price !== undefined ? { price: Number(dto.price) } : {}),
    };

    // If owner edits listing after rejection/active, put it back under review.
    if (!isAdmin && existing.approvalStatus !== 'PENDING') {
      nextData.approvalStatus = 'PENDING';
    }

    return this.prisma.property.update({
      where: { id },
      data: nextData,
    });
  }

  async updateApprovalStatus(
    id: string,
    user: { id: string; role?: string },
    approvalStatus: 'PENDING' | 'ACTIVE' | 'REJECTED',
  ) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin can change approval status');
    }

    const existing = await this.prisma.property.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Property not found');
    }

    return this.prisma.property.update({
      where: { id },
      data: { approvalStatus },
    });
  }
}
