import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAgentsForAdmin(pageRaw: number, pageSizeRaw: number) {
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const pageSize =
      Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(100, Math.floor(pageSizeRaw)) : 10;
    const skip = (page - 1) * pageSize;

    const where = { role: UserRole.AGENT };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          agencyName: true,
          cityOrArea: true,
          reraLicenseNumber: true,
          profileImageUrl: true,
          about: true,
          responseTime: true,
          languages: true,
          specializations: true,
          createdAt: true,
          _count: { select: { properties: true } },
        },
      }),
    ]);

    const viewingCounts = await Promise.all(
      users.map((u) =>
        this.prisma.viewing.count({
          where: { property: { ownerId: u.id } },
        }),
      ),
    );

    const items = users.map((u, i) => {
      const totalProperties = u._count.properties;
      const { _count, ...rest } = u;
      return {
        ...rest,
        listingsTotal: totalProperties,
        leadsTotal: totalProperties,
        viewingsTotal: viewingCounts[i] ?? 0,
      };
    });

    return { items, total, page, pageSize };
  }

  /** Users and agents for admin messaging directory (excludes other admins). */
  async findPeersForAdmin(q?: string) {
    const base: Prisma.UserWhereInput = {
      role: { in: [UserRole.USER, UserRole.AGENT] },
    };
    const trimmed = q?.trim();
    const where: Prisma.UserWhereInput = trimmed
      ? {
          AND: [
            base,
            {
              OR: [
                { fullName: { contains: trimmed, mode: 'insensitive' } },
                { email: { contains: trimmed, mode: 'insensitive' } },
                { phone: { contains: trimmed, mode: 'insensitive' } },
                { agencyName: { contains: trimmed, mode: 'insensitive' } },
              ],
            },
          ],
        }
      : base;

    return this.prisma.user.findMany({
      where,
      orderBy: [{ fullName: 'asc' }],
      take: 500,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        agencyName: true,
        cityOrArea: true,
        profileImageUrl: true,
      },
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        agencyName: true,
        cityOrArea: true,
        reraLicenseNumber: true,
        profileImageUrl: true,
        about: true,
        responseTime: true,
        languages: true,
        specializations: true,
        createdAt: true,
      },
    });
  }

  async getProfileInsights(profileUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: profileUserId },
      select: {
        id: true,
        role: true,
        fullName: true,
        agencyName: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const propertySelect = {
      id: true,
      title: true,
      city: true,
      address: true,
      price: true,
      currency: true,
      imageUrls: true,
      bedrooms: true,
      bathrooms: true,
      areaSqFt: true,
      createdAt: true,
    } as const;

    const isAgentLike =
      user.role === UserRole.AGENT || user.role === UserRole.ADMIN;

    if (isAgentLike) {
      const properties = await this.prisma.property.findMany({
        where: {
          ownerId: profileUserId,
          isActive: true,
          approvalStatus: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
        select: propertySelect,
      });

      const incomingViewings = await this.prisma.viewing.findMany({
        where: { property: { ownerId: profileUserId } },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          user: {
            select: { fullName: true, profileImageUrl: true },
          },
          property: { select: { title: true } },
        },
      });

      const reviews = incomingViewings
        .filter((v) => v.notes?.trim())
        .map((v) => ({
          id: v.id,
          reviewerName: v.user?.fullName || 'Client',
          reviewerImageUrl: v.user?.profileImageUrl || null,
          rating: 5,
          body: v.notes!.trim(),
          date: v.createdAt.toISOString(),
          propertyTitle: v.property?.title || 'Property',
        }));

      const ratings = reviews.map((r) => Number(r.rating) || 5);
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, n) => sum + n, 0) / ratings.length
          : null;

      return {
        profileRole: user.role,
        stats: {
          stat1Value: String(properties.length),
          stat1Label: 'Properties Listed',
          stat2Value: String(
            incomingViewings.filter((v) => v.status !== 'CANCELLED').length,
          ),
          stat2Label: 'Viewings',
          stat3Value: averageRating != null ? averageRating.toFixed(1) : '—',
          stat3Label: 'Average Rating',
          reviewCount: reviews.length,
          agencyName: user.agencyName || 'Independent',
        },
        listedProperties: properties,
        viewingProperties: [],
        reviews,
      };
    }

    const viewings = await this.prisma.viewing.findMany({
      where: { userId: profileUserId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        property: {
          include: {
            owner: {
              select: {
                id: true,
                fullName: true,
                agencyName: true,
                profileImageUrl: true,
              },
            },
          },
        },
      },
    });

    const propertyMap = new Map<string, (typeof viewings)[0]['property']>();
    const agencySet = new Set<string>();
    viewings.forEach((v) => {
      if (!v.property) return;
      propertyMap.set(v.property.id, v.property);
      const agency =
        v.property.owner?.agencyName?.trim() ||
        v.property.owner?.fullName?.trim();
      if (agency) agencySet.add(agency);
    });

    const viewingProperties = Array.from(propertyMap.values()).map((p) => ({
      id: p!.id,
      title: p!.title,
      city: p!.city,
      address: p!.address,
      price: p!.price,
      currency: p!.currency,
      imageUrls: p!.imageUrls,
      bedrooms: p!.bedrooms,
      bathrooms: p!.bathrooms,
      areaSqFt: p!.areaSqFt,
      createdAt: p!.createdAt,
      owner: p!.owner,
    }));

    const reviews = viewings
      .filter((v) => v.notes?.trim())
      .map((v) => ({
        id: v.id,
        reviewerName: user.fullName,
        reviewerImageUrl: null,
        rating: 5,
        body: v.notes!.trim(),
        date: (v.scheduledAt || v.createdAt).toISOString(),
        propertyTitle: v.property?.title || 'Property',
      }));

    return {
      profileRole: user.role,
      stats: {
        stat1Value: String(viewings.length),
        stat1Label: 'Viewings Booked',
        stat2Value: String(agencySet.size),
        stat2Label: 'Agencies',
        stat3Value: String(viewingProperties.length),
        stat3Label: 'Properties Viewed',
        reviewCount: reviews.length,
        agencyName: null,
      },
      listedProperties: [],
      viewingProperties,
      reviews,
    };
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        agencyName: true,
        cityOrArea: true,
        reraLicenseNumber: true,
        profileImageUrl: true,
        about: true,
        responseTime: true,
        languages: true,
        specializations: true,
        createdAt: true,
      },
    });
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        agencyName: true,
        cityOrArea: true,
        reraLicenseNumber: true,
        profileImageUrl: true,
        about: true,
        responseTime: true,
        languages: true,
        specializations: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        agencyName: true,
        cityOrArea: true,
        reraLicenseNumber: true,
        profileImageUrl: true,
        about: true,
        responseTime: true,
        languages: true,
        specializations: true,
        createdAt: true,
      },
    });
  }
}
