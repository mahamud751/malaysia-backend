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

  async getAgentAnalytics(agentId: string, daysRaw = 30) {
    const days = Math.min(90, Math.max(7, Number(daysRaw) || 30));
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    const prevTo = new Date(from);
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - days);

    const user = await this.prisma.user.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        role: true,
        fullName: true,
        profileImageUrl: true,
        agencyName: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== UserRole.AGENT && user.role !== UserRole.ADMIN) {
      throw new NotFoundException('Analytics are only available for agents');
    }

    const fmt = (d: Date) =>
      d.toLocaleDateString('en-GB', { month: 'short', day: '2-digit' });
    const periodLabel = `Last ${days} Days (${fmt(from)}–${fmt(to)})`;

    const properties = await this.prisma.property.findMany({
      where: {
        ownerId: agentId,
        isActive: true,
        approvalStatus: 'ACTIVE',
      },
      select: {
        id: true,
        title: true,
        city: true,
        price: true,
        currency: true,
        imageUrls: true,
        createdAt: true,
      },
    });

    const viewingInclude = {
      user: { select: { id: true, fullName: true, profileImageUrl: true } },
      property: {
        select: {
          id: true,
          title: true,
          city: true,
          price: true,
          currency: true,
          imageUrls: true,
        },
      },
    } as const;

    const [viewingsCurrent, viewingsPrevious] = await Promise.all([
      this.prisma.viewing.findMany({
        where: {
          property: { ownerId: agentId },
          createdAt: { gte: from, lte: to },
        },
        include: viewingInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.viewing.findMany({
        where: {
          property: { ownerId: agentId },
          createdAt: { gte: prevFrom, lt: prevTo },
        },
        include: viewingInclude,
      }),
    ]);

    const pctTrend = (current: number, previous: number) => {
      if (previous <= 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 1000) / 10;
    };

    const isLead = (v: { status: string }) => v.status !== 'CANCELLED';
    const isClosed = (v: { status: string }) => v.status === 'COMPLETED';
    const isSoft = (v: { status: string }) => v.status === 'PENDING';

    const leadsCurrent = viewingsCurrent.filter(isLead);
    const leadsPrevious = viewingsPrevious.filter(isLead);
    const closedCurrent = viewingsCurrent.filter(isClosed);
    const closedPrevious = viewingsPrevious.filter(isClosed);

    const sumDealValue = (rows: typeof viewingsCurrent) =>
      rows.reduce((sum, v) => sum + Number(v.property?.price || 0), 0);

    const totalEarnings = sumDealValue(closedCurrent);
    const prevEarnings = sumDealValue(closedPrevious);
    const totalPreviews = viewingsCurrent.length;
    const conversionRate =
      leadsCurrent.length > 0
        ? Math.round((closedCurrent.length / leadsCurrent.length) * 1000) / 10
        : 0;

    const weeklyConversion: {
      weekLabel: string;
      leads: number;
      closed: number;
      rate: number;
    }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const weekEnd = new Date(to);
      weekEnd.setHours(23, 59, 59, 999);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const weekRows = viewingsCurrent.filter((v) => {
        const d = new Date(v.createdAt);
        return d >= weekStart && d <= weekEnd;
      });
      const weekLeads = weekRows.filter(isLead).length;
      const weekClosed = weekRows.filter(isClosed).length;
      weeklyConversion.push({
        weekLabel: `WK${6 - i}`,
        leads: weekLeads,
        closed: weekClosed,
        rate:
          weekLeads > 0
            ? Math.round((weekClosed / weekLeads) * 1000) / 10
            : 0,
      });
    }

    const weeklyEarnings: { weekLabel: string; amount: number }[] = [];
    for (let i = 3; i >= 0; i -= 1) {
      const weekEnd = new Date(to);
      weekEnd.setHours(23, 59, 59, 999);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      const weekClosed = viewingsCurrent.filter((v) => {
        if (!isClosed(v)) return false;
        const d = new Date(v.createdAt);
        return d >= weekStart && d <= weekEnd;
      });
      weeklyEarnings.push({
        weekLabel: `WK${4 - i}`,
        amount: sumDealValue(weekClosed),
      });
    }

    const propertyLeadCounts = new Map<string, number>();
    leadsCurrent.forEach((v) => {
      propertyLeadCounts.set(
        v.propertyId,
        (propertyLeadCounts.get(v.propertyId) || 0) + 1,
      );
    });

    let topPropertyId = properties[0]?.id || null;
    let topLeadCount = 0;
    propertyLeadCounts.forEach((count, propertyId) => {
      if (count > topLeadCount) {
        topLeadCount = count;
        topPropertyId = propertyId;
      }
    });

    const topFromViewing = viewingsCurrent.find(
      (v) => v.propertyId === topPropertyId,
    )?.property;
    const topFromList = properties.find((p) => p.id === topPropertyId);
    const topProperty = topFromViewing || topFromList || properties[0] || null;

    const topPropertyClosed = topProperty
      ? closedCurrent.filter((v) => v.propertyId === topProperty.id).length
      : 0;
    const daysInPeriod = Math.max(1, days);
    const avgDailyLeads =
      Math.round((leadsCurrent.length / daysInPeriod) * 10) / 10;

    const leadSourceMap = new Map<string, number>();
    leadsCurrent.forEach((v) => {
      const name = v.user?.fullName?.trim() || 'Direct';
      leadSourceMap.set(name, (leadSourceMap.get(name) || 0) + 1);
    });
    const leadSources = Array.from(leadSourceMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const avgDeal =
      closedCurrent.length > 0
        ? Math.round(totalEarnings / closedCurrent.length)
        : 0;

    return {
      agent: {
        id: user.id,
        fullName: user.fullName,
        profileImageUrl: user.profileImageUrl,
        agencyName: user.agencyName,
      },
      period: {
        days,
        label: periodLabel,
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        totalEarnings,
        totalPreviews,
        conversionRate,
        currency: 'GBP',
      },
      cards: {
        totalLeads: {
          value: leadsCurrent.length,
          trend: pctTrend(leadsCurrent.length, leadsPrevious.length),
          subLabel: `${viewingsCurrent.filter(isSoft).length} Soft`,
        },
        listings: {
          value: properties.length,
          trend: pctTrend(
            properties.filter((p) => new Date(p.createdAt) >= from).length,
            properties.filter((p) => {
              const d = new Date(p.createdAt);
              return d >= prevFrom && d < prevTo;
            }).length,
          ),
          subLabel: `${properties.length} Active`,
        },
        viewings: {
          value: viewingsCurrent.length,
          trend: pctTrend(viewingsCurrent.length, viewingsPrevious.length),
          subLabel: `${viewingsCurrent.filter((v) => v.status === 'CONFIRMED').length} Confirmed`,
        },
        closedDeals: {
          value: closedCurrent.length,
          trend: pctTrend(closedCurrent.length, closedPrevious.length),
          subLabel: `${totalEarnings.toLocaleString('en-GB')} Earnings`,
        },
      },
      weeklyConversion,
      earningBreakdown: {
        closedDeals: closedCurrent.length,
        leadsHandled: leadsCurrent.length,
        conversionRate,
        avgDeal,
        weeklyEarnings,
      },
      topListing: topProperty
        ? {
            property: topProperty,
            leads: topLeadCount || leadsCurrent.length,
            closedDeals: topPropertyClosed,
            avgDaily: avgDailyLeads,
            earnings: sumDealValue(
              closedCurrent.filter((v) => v.propertyId === topProperty.id),
            ),
          }
        : null,
      leadSources,
      topAnalyticsValue: totalEarnings,
      earningsTrend: pctTrend(totalEarnings, prevEarnings),
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
