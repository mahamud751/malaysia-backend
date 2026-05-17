import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateAdminSettingsDto } from './dto/update-admin-settings.dto';

const DEFAULT_PLATFORM_SETTINGS = {
  platform: [
    {
      key: 'verify_agent_signups',
      label: 'Verify new agent signups manually',
      checked: true,
      enabled: true,
    },
    {
      key: 'auto_archive_listings',
      label: 'Auto-archive flagged listings after 7 days',
      checked: false,
      enabled: true,
    },
    {
      key: 'double_opt_in_leads',
      label: 'Require double opt-in for new leads',
      checked: false,
      enabled: false,
    },
  ],
  features: [
    {
      key: 'lead_routing',
      label: 'Lead routing automation',
      checked: true,
      enabled: true,
    },
    {
      key: 'listing_flagging',
      label: 'Listing flagging',
      checked: false,
      enabled: true,
    },
    {
      key: 'agent_status_monitoring',
      label: 'Agent status monitoring',
      checked: true,
      enabled: false,
    },
    {
      key: 'advanced_reporting',
      label: 'Advanced reporting',
      checked: true,
      enabled: false,
    },
  ],
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAgentsForAdmin(
    pageRaw: number,
    pageSizeRaw: number,
    q?: string,
    filter?: string,
  ) {
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const pageSize =
      Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(100, Math.floor(pageSizeRaw)) : 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = { role: UserRole.AGENT };

    const trimmed = q?.trim();
    if (trimmed) {
      where.AND = [
        {
          OR: [
            { fullName: { contains: trimmed, mode: 'insensitive' } },
            { email: { contains: trimmed, mode: 'insensitive' } },
            { phone: { contains: trimmed, mode: 'insensitive' } },
            { agencyName: { contains: trimmed, mode: 'insensitive' } },
            { cityOrArea: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const filterKey = (filter || 'all').toLowerCase();
    if (filterKey === 'at_risk') {
      where.properties = {
        none: { approvalStatus: 'ACTIVE', isActive: true },
      };
    } else if (filterKey === 'with_listings' || filterKey === 'listings') {
      where.properties = {
        some: { approvalStatus: 'ACTIVE', isActive: true },
      };
    }

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
          _count: {
            select: {
              properties: {
                where: { approvalStatus: 'ACTIVE', isActive: true },
              },
            },
          },
        },
      }),
    ]);

    const leadCounts = await Promise.all(
      users.map((u) =>
        this.prisma.viewing.count({
          where: {
            property: { ownerId: u.id },
            status: { not: 'CANCELLED' },
          },
        }),
      ),
    );

    const viewingCounts = await Promise.all(
      users.map((u) =>
        this.prisma.viewing.count({
          where: { property: { ownerId: u.id } },
        }),
      ),
    );

    const items = users.map((u, i) => {
      const listingsTotal = u._count.properties;
      const { _count, ...rest } = u;
      const atRisk = listingsTotal === 0;
      return {
        ...rest,
        listingsTotal,
        leadsTotal: leadCounts[i] ?? 0,
        viewingsTotal: viewingCounts[i] ?? 0,
        agentStatus: atRisk ? 'At Risk' : 'Active',
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

  async getAdminDashboard(daysRaw = 30) {
    const days = Math.min(90, Math.max(7, Number(daysRaw) || 30));
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - days);
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - days);

    const pctTrend = (current: number, previous: number) => {
      if (previous <= 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 1000) / 10;
    };

    const [
      usersCurrent,
      usersPrevious,
      agentsCurrent,
      agentsPrevious,
      listingsCurrent,
      listingsPrevious,
      totalUsers,
      totalAgents,
      activeListings,
      pendingListings,
      pendingViewings,
      periodViewings,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { role: UserRole.USER, createdAt: { gte: from, lte: now } },
      }),
      this.prisma.user.count({
        where: { role: UserRole.USER, createdAt: { gte: prevFrom, lt: from } },
      }),
      this.prisma.user.count({
        where: { role: UserRole.AGENT, createdAt: { gte: from, lte: now } },
      }),
      this.prisma.user.count({
        where: { role: UserRole.AGENT, createdAt: { gte: prevFrom, lt: from } },
      }),
      this.prisma.property.count({
        where: {
          approvalStatus: 'ACTIVE',
          isActive: true,
          createdAt: { gte: from, lte: now },
        },
      }),
      this.prisma.property.count({
        where: {
          approvalStatus: 'ACTIVE',
          isActive: true,
          createdAt: { gte: prevFrom, lt: from },
        },
      }),
      this.prisma.user.count({ where: { role: UserRole.USER } }),
      this.prisma.user.count({ where: { role: UserRole.AGENT } }),
      this.prisma.property.count({
        where: { approvalStatus: 'ACTIVE', isActive: true },
      }),
      this.prisma.property.count({ where: { approvalStatus: 'PENDING' } }),
      this.prisma.viewing.count({ where: { status: 'PENDING' } }),
      this.prisma.viewing.count({
        where: { createdAt: { gte: from, lte: now } },
      }),
    ]);

    const agentsWithListings = await this.prisma.user.findMany({
      where: { role: UserRole.AGENT },
      select: {
        id: true,
        _count: {
          select: {
            properties: {
              where: { approvalStatus: 'ACTIVE', isActive: true },
            },
          },
        },
      },
    });
    const atRiskAgents = agentsWithListings.filter(
      (a) => a._count.properties === 0,
    ).length;

    const [recentProperties, recentViewings, recentUsers] = await Promise.all([
      this.prisma.property.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          title: true,
          city: true,
          propertyType: true,
          price: true,
          currency: true,
          imageUrls: true,
          updatedAt: true,
          owner: { select: { fullName: true } },
        },
      }),
      this.prisma.viewing.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          user: { select: { fullName: true } },
          property: {
            select: {
              id: true,
              title: true,
              city: true,
              imageUrls: true,
            },
          },
        },
      }),
      this.prisma.user.findMany({
        where: { role: { in: [UserRole.USER, UserRole.AGENT] } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          fullName: true,
          role: true,
          profileImageUrl: true,
          createdAt: true,
        },
      }),
    ]);

    const activityItems = [
      ...recentProperties.map((p) => ({
        id: `property-${p.id}`,
        type: 'listing',
        title: `${p.owner?.fullName || 'Agent'} updated listing`,
        subtitle: p.title,
        imageUrl: p.imageUrls?.[0] || null,
        createdAt: p.updatedAt.toISOString(),
      })),
      ...recentViewings.map((v) => ({
        id: `viewing-${v.id}`,
        type: 'lead',
        title: `${v.user?.fullName || 'User'} booked a viewing`,
        subtitle: v.property?.title || 'Property',
        imageUrl: v.property?.imageUrls?.[0] || null,
        createdAt: v.createdAt.toISOString(),
      })),
      ...recentUsers.map((u) => ({
        id: `user-${u.id}`,
        type: 'agent',
        title: `${u.fullName} joined as ${u.role}`,
        subtitle: 'New registration',
        imageUrl: u.profileImageUrl,
        createdAt: u.createdAt.toISOString(),
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 6);

    const monthBuckets: {
      month: string;
      start: Date;
      end: Date;
    }[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
        999,
      );
      monthBuckets.push({
        month: start.toLocaleString('en-US', { month: 'short' }),
        start,
        end,
      });
    }

    const [allViewingsForChart, allUsersForChart, allPropertiesForChart] =
      await Promise.all([
        this.prisma.viewing.findMany({
          where: {
            createdAt: {
              gte: monthBuckets[0]?.start ?? from,
              lte: now,
            },
          },
          select: { createdAt: true, status: true },
        }),
        this.prisma.user.findMany({
          where: {
            createdAt: {
              gte: monthBuckets[0]?.start ?? from,
              lte: now,
            },
          },
          select: { createdAt: true },
        }),
        this.prisma.property.findMany({
          where: {
            createdAt: {
              gte: monthBuckets[0]?.start ?? from,
              lte: now,
            },
          },
          select: { createdAt: true },
        }),
      ]);

    const trafficData = monthBuckets.map((bucket) => {
      const inMonth = (d: Date) => d >= bucket.start && d <= bucket.end;
      const visitors = allUsersForChart.filter((u) =>
        inMonth(new Date(u.createdAt)),
      ).length;
      const listingViewed = allViewingsForChart.filter((v) =>
        inMonth(new Date(v.createdAt)),
      ).length;
      const inquiries = allViewingsForChart.filter(
        (v) => v.status === 'PENDING' && inMonth(new Date(v.createdAt)),
      ).length;
      return {
        month: bucket.month,
        visitors,
        listingViewed,
        inquiries,
        value: listingViewed,
      };
    });

    const maxBar = Math.max(1, ...trafficData.map((m) => m.value));
    const trafficChart = trafficData.map((m) => ({
      ...m,
      barHeight: Math.round((m.value / maxBar) * 175),
    }));

    const formatCompact = (n: number) => {
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
      if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
      return String(n);
    };

    const periodVisitors = usersCurrent + agentsCurrent;
    const prevVisitors = usersPrevious + agentsPrevious;

    const [feedAgents, feedListings, feedLeads, feedReviews] =
      await Promise.all([
        this.prisma.user.findMany({
          where: { role: UserRole.AGENT },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: {
            id: true,
            fullName: true,
            agencyName: true,
            profileImageUrl: true,
            createdAt: true,
          },
        }),
        this.prisma.property.findMany({
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: {
            id: true,
            title: true,
            city: true,
            propertyType: true,
            price: true,
            currency: true,
            imageUrls: true,
          },
        }),
        this.prisma.viewing.findMany({
          orderBy: { createdAt: 'desc' },
          take: 12,
          include: {
            user: { select: { fullName: true } },
            property: {
              select: {
                id: true,
                title: true,
                city: true,
                propertyType: true,
                price: true,
                currency: true,
                imageUrls: true,
              },
            },
          },
        }),
        this.prisma.viewing.findMany({
          where: { notes: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 12,
          include: {
            user: { select: { fullName: true } },
            property: {
              select: {
                id: true,
                title: true,
                city: true,
                propertyType: true,
                price: true,
                currency: true,
                imageUrls: true,
              },
            },
          },
        }),
      ]);

    const mapListingCard = (p: {
      id: string;
      title: string;
      city: string;
      propertyType: string | null;
      price: unknown;
      currency: string;
      imageUrls: string[];
    }) => ({
      id: p.id,
      name: p.title,
      price: Number(p.price),
      currency: p.currency || 'GBP',
      propertyType: p.propertyType || 'Property',
      location: p.city,
      imageUrl: p.imageUrls?.[0] || null,
    });

    const cities = await this.prisma.property.findMany({
      where: { isActive: true },
      select: { city: true },
      distinct: ['city'],
      take: 50,
    });

    return {
      periodDays: days,
      recommended: [
        {
          label: 'Total User',
          value: totalUsers,
          trend: pctTrend(usersCurrent, usersPrevious),
        },
        {
          label: 'Active Agent',
          value: totalAgents,
          trend: pctTrend(agentsCurrent, agentsPrevious),
        },
        {
          label: 'Active Listings',
          value: activeListings,
          trend: pctTrend(listingsCurrent, listingsPrevious),
        },
      ],
      attention: [
        {
          label: `${pendingListings} Pending Approval`,
          color: '#F75555',
          action: 'View',
          screen: 'AdminListings',
        },
        {
          label: `${atRiskAgents} At-Risk Agent`,
          color: '#FFAB38',
          action: 'View',
          screen: 'AdminAgents',
        },
        {
          label: `${pendingViewings} Unanswered Leads`,
          color: '#4ADE80',
          action: 'View',
          screen: 'AdminViewings',
        },
      ],
      recentActivities: activityItems,
      traffic: {
        chart: trafficChart,
        visitors: formatCompact(periodVisitors),
        listingViewed: formatCompact(periodViewings),
        inquiries: formatCompact(pendingViewings),
        registrationTrend: pctTrend(periodVisitors, prevVisitors),
      },
      feeds: {
        agents: feedAgents.map((a) => ({
          id: a.id,
          name: a.fullName,
          price: 0,
          currency: 'GBP',
          propertyType: a.agencyName || 'Agent',
          location: 'Malaysia',
          imageUrl: a.profileImageUrl,
        })),
        listings: feedListings.map(mapListingCard),
        leads: feedLeads.map((v) =>
          mapListingCard({
            id: v.property?.id || v.id,
            title: v.property?.title || 'Viewing request',
            city: v.property?.city || 'Malaysia',
            propertyType: v.property?.propertyType || 'Lead',
            price: v.property?.price || 0,
            currency: v.property?.currency || 'GBP',
            imageUrls: v.property?.imageUrls || [],
          }),
        ),
        reviews: feedReviews
          .filter((v) => v.notes?.trim())
          .map((v) =>
            mapListingCard({
              id: v.property?.id || v.id,
              title: v.property?.title || 'Review',
              city: v.property?.city || 'Malaysia',
              propertyType: 'Review',
              price: v.property?.price || 0,
              currency: v.property?.currency || 'GBP',
              imageUrls: v.property?.imageUrls || [],
            }),
          ),
      },
      totalAgents,
      cities: cities.map((c) => c.city).filter(Boolean),
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

  private async getOrCreatePlatformSettings() {
    const existing = await this.prisma.platformSettings.findUnique({
      where: { id: 'default' },
    });
    if (existing) return existing;
    return this.prisma.platformSettings.create({
      data: {
        id: 'default',
        monthlyFeeGbp: 800,
        settings: DEFAULT_PLATFORM_SETTINGS as Prisma.InputJsonValue,
      },
    });
  }

  async getAdminSettings() {
    const row = await this.getOrCreatePlatformSettings();
    const json = (row.settings || {}) as {
      platform?: typeof DEFAULT_PLATFORM_SETTINGS.platform;
      features?: typeof DEFAULT_PLATFORM_SETTINGS.features;
    };
    return {
      monthlyFeeGbp: Number(row.monthlyFeeGbp),
      platform: json.platform?.length
        ? json.platform
        : DEFAULT_PLATFORM_SETTINGS.platform,
      features: json.features?.length
        ? json.features
        : DEFAULT_PLATFORM_SETTINGS.features,
    };
  }

  async updateAdminSettings(dto: UpdateAdminSettingsDto) {
    const row = await this.getOrCreatePlatformSettings();
    const current = (row.settings || {}) as Record<string, unknown>;
    const nextSettings = {
      platform:
        dto.platform ??
        (current.platform as typeof DEFAULT_PLATFORM_SETTINGS.platform) ??
        DEFAULT_PLATFORM_SETTINGS.platform,
      features:
        dto.features ??
        (current.features as typeof DEFAULT_PLATFORM_SETTINGS.features) ??
        DEFAULT_PLATFORM_SETTINGS.features,
    };
    await this.prisma.platformSettings.update({
      where: { id: 'default' },
      data: {
        ...(dto.monthlyFeeGbp != null
          ? { monthlyFeeGbp: dto.monthlyFeeGbp }
          : {}),
        settings: nextSettings as unknown as Prisma.InputJsonValue,
      },
    });
    return this.getAdminSettings();
  }

  async listAdmins() {
    return this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        profileImageUrl: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async searchRoleCandidates(q?: string) {
    const trimmed = q?.trim();
    const where: Prisma.UserWhereInput = {
      role: { not: UserRole.ADMIN },
    };
    if (trimmed) {
      where.AND = [
        {
          OR: [
            { fullName: { contains: trimmed, mode: 'insensitive' } },
            { email: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
      ];
    }
    return this.prisma.user.findMany({
      where,
      take: 25,
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        profileImageUrl: true,
      },
    });
  }

  async promoteToAdmin(
    actingAdminId: string,
    opts: { userId?: string; email?: string },
  ) {
    let target = null as Awaited<
      ReturnType<typeof this.prisma.user.findUnique>
    > | null;
    if (opts.userId) {
      target = await this.prisma.user.findUnique({ where: { id: opts.userId } });
    } else if (opts.email?.trim()) {
      target = await this.prisma.user.findUnique({
        where: { email: opts.email.trim().toLowerCase() },
      });
    } else {
      throw new BadRequestException('userId or email is required');
    }
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (target.role === UserRole.ADMIN) {
      throw new BadRequestException('User is already an admin');
    }
    return this.prisma.user.update({
      where: { id: target.id },
      data: { role: UserRole.ADMIN },
      select: {
        id: true,
        fullName: true,
        email: true,
        profileImageUrl: true,
        role: true,
      },
    });
  }

  async demoteAdmin(actingAdminId: string, targetUserId: string) {
    if (actingAdminId === targetUserId) {
      throw new BadRequestException('You cannot remove your own admin access');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (target.role !== UserRole.ADMIN) {
      throw new BadRequestException('User is not an admin');
    }
    const adminCount = await this.prisma.user.count({
      where: { role: UserRole.ADMIN },
    });
    if (adminCount <= 1) {
      throw new BadRequestException('Cannot remove the last admin');
    }
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: UserRole.USER },
      select: {
        id: true,
        fullName: true,
        email: true,
        profileImageUrl: true,
        role: true,
      },
    });
  }

  async setUserRole(
    actingAdminId: string,
    targetUserId: string,
    role: UserRole,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (role === UserRole.ADMIN) {
      return this.promoteToAdmin(actingAdminId, { userId: targetUserId });
    }
    if (target.role === UserRole.ADMIN) {
      if (role === UserRole.USER) {
        return this.demoteAdmin(actingAdminId, targetUserId);
      }
      const adminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot change role of the last admin');
      }
    }
    return this.update(targetUserId, { role });
  }
}
