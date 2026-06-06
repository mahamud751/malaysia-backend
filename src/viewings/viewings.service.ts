import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ViewingStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateViewingDto } from './dto/create-viewing.dto';
import { UpdateViewingNoteDto } from './dto/update-viewing-note.dto';
import { UpdateViewingScheduleDto } from './dto/update-viewing-schedule.dto';
import { UpdateViewingStatusDto } from './dto/update-viewing-status.dto';

const VIEWING_STATUS_LABEL: Record<ViewingStatus, string> = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

@Injectable()
export class ViewingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateViewingDto) {
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });
    if (!property || !property.isActive) {
      throw new NotFoundException('Property is not available for booking');
    }

    const viewing = await this.prisma.viewing.create({
      data: {
        userId,
        propertyId: dto.propertyId,
        scheduledAt: new Date(dto.scheduledAt),
        notes: dto.notes,
        status: ViewingStatus.PENDING,
      },
      include: {
        property: {
          include: {
            owner: {
              select: { id: true, fullName: true, phone: true, email: true, profileImageUrl: true },
            },
          },
        },
        user: {
          select: { id: true, fullName: true },
        },
      },
    });

    if (viewing.property.ownerId && viewing.property.ownerId !== userId) {
      await this.notifications.notifyUser(viewing.property.ownerId, {
        type: 'VIEWING_REQUEST',
        title: 'New viewing request',
        body: `${viewing.user.fullName} requested a viewing for ${viewing.property.title}`,
        data: {
          route: 'viewing',
          viewingId: viewing.id,
          propertyId: viewing.propertyId,
          propertyTitle: viewing.property.title,
          status: viewing.status,
        },
      });
    }

    return viewing;
  }

  findMy(userId: string) {
    return this.prisma.viewing.findMany({
      where: { userId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            address: true,
            price: true,
            currency: true,
            imageUrls: true,
            videoUrls: true,
            bedrooms: true,
            bathrooms: true,
            areaSqFt: true,
            owner: {
              select: { id: true, fullName: true, phone: true, email: true, profileImageUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Full list for admin dashboards (all users’ bookings). */
  findAllForAdmin() {
    return this.prisma.viewing.findMany({
      orderBy: { scheduledAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            profileImageUrl: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            address: true,
            price: true,
            currency: true,
            imageUrls: true,
            videoUrls: true,
            bedrooms: true,
            bathrooms: true,
            areaSqFt: true,
            owner: {
              select: { id: true, fullName: true, phone: true, email: true, profileImageUrl: true },
            },
          },
        },
      },
    });
  }

  /** List bookings for properties owned by current user (agent/owner side). */
  findAllForOwner(ownerId: string) {
    return this.prisma.viewing.findMany({
      where: {
        property: {
          ownerId,
        },
      },
      orderBy: { scheduledAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            profileImageUrl: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            description: true,
            city: true,
            address: true,
            price: true,
            currency: true,
            imageUrls: true,
            videoUrls: true,
            bedrooms: true,
            bathrooms: true,
            areaSqFt: true,
            owner: {
              select: { id: true, fullName: true, phone: true, email: true, profileImageUrl: true },
            },
          },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const viewing = await this.prisma.viewing.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            profileImageUrl: true,
          },
        },
        property: {
          include: {
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
          },
        },
      },
    });
    if (!viewing) {
      throw new NotFoundException('Viewing not found');
    }
    if (viewing.userId !== userId && viewing.property.ownerId !== userId) {
      throw new ForbiddenException('Not allowed to view this viewing');
    }
    return viewing;
  }

  async updateStatus(id: string, userId: string, dto: UpdateViewingStatusDto) {
    const viewing = await this.prisma.viewing.findUnique({
      where: { id },
      include: { property: true },
    });
    if (!viewing) {
      throw new NotFoundException('Viewing not found');
    }

    if (viewing.userId !== userId && viewing.property.ownerId !== userId) {
      throw new ForbiddenException('Not allowed to update this viewing');
    }

    const updated = await this.prisma.viewing.update({
      where: { id },
      data: { status: dto.status },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            ownerId: true,
            owner: { select: { fullName: true } },
          },
        },
        user: { select: { id: true, fullName: true } },
      },
    });

    const recipientId =
      userId === updated.userId ? updated.property.ownerId : updated.userId;
    if (recipientId && recipientId !== userId) {
      const actorName =
        userId === updated.userId
          ? updated.user.fullName
          : updated.property.owner?.fullName || 'Agent';
      await this.notifications.notifyUser(recipientId, {
        type: 'VIEWING_STATUS',
        title: 'Viewing status updated',
        body: `${actorName} marked your viewing for ${updated.property.title} as ${VIEWING_STATUS_LABEL[dto.status]}`,
        data: {
          route: 'viewing',
          viewingId: updated.id,
          propertyId: updated.property.id,
          propertyTitle: updated.property.title,
          status: dto.status,
        },
      });
    }

    return updated;
  }

  async updateSchedule(id: string, userId: string, dto: UpdateViewingScheduleDto) {
    const viewing = await this.prisma.viewing.findUnique({
      where: { id },
      include: { property: true },
    });
    if (!viewing) {
      throw new NotFoundException('Viewing not found');
    }

    if (viewing.userId !== userId && viewing.property.ownerId !== userId) {
      throw new ForbiddenException('Not allowed to update this viewing');
    }

    if (viewing.status === ViewingStatus.CANCELLED || viewing.status === ViewingStatus.COMPLETED) {
      throw new ForbiddenException('Cannot reschedule a cancelled or completed viewing');
    }

    const nextStatus =
      viewing.status === ViewingStatus.CONFIRMED
        ? ViewingStatus.CONFIRMED
        : ViewingStatus.PENDING;

    const updated = await this.prisma.viewing.update({
      where: { id },
      data: {
        scheduledAt: new Date(dto.scheduledAt),
        status: nextStatus,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            profileImageUrl: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            description: true,
            city: true,
            address: true,
            price: true,
            currency: true,
            imageUrls: true,
            videoUrls: true,
            bedrooms: true,
            bathrooms: true,
            areaSqFt: true,
            ownerId: true,
            owner: {
              select: { id: true, fullName: true, phone: true, email: true, profileImageUrl: true },
            },
          },
        },
      },
    });

    const recipientId =
      userId === updated.userId ? updated.property.ownerId : updated.userId;
    if (recipientId && recipientId !== userId) {
      const when = updated.scheduledAt.toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      await this.notifications.notifyUser(recipientId, {
        type: 'VIEWING_RESCHEDULE',
        title: 'Viewing rescheduled',
        body: `Viewing for ${updated.property.title} was moved to ${when}`,
        data: {
          route: 'viewing',
          viewingId: updated.id,
          propertyId: updated.property.id,
          propertyTitle: updated.property.title,
          status: updated.status,
        },
      });
    }

    return updated;
  }

  async updateNote(id: string, userId: string, dto: UpdateViewingNoteDto) {
    const viewing = await this.prisma.viewing.findUnique({
      where: { id },
      include: { property: true },
    });
    if (!viewing) {
      throw new NotFoundException('Viewing not found');
    }

    if (viewing.userId !== userId && viewing.property.ownerId !== userId) {
      throw new ForbiddenException('Not allowed to update this viewing');
    }

    return this.prisma.viewing.update({
      where: { id },
      data: { notes: dto.note || null },
    });
  }
}
