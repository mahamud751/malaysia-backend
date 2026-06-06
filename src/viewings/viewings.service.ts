import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ViewingStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateViewingDto } from './dto/create-viewing.dto';
import { UpdateViewingNoteDto } from './dto/update-viewing-note.dto';
import { UpdateViewingScheduleDto } from './dto/update-viewing-schedule.dto';
import { UpdateViewingStatusDto } from './dto/update-viewing-status.dto';

@Injectable()
export class ViewingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateViewingDto) {
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });
    if (!property || !property.isActive) {
      throw new NotFoundException('Property is not available for booking');
    }

    return this.prisma.viewing.create({
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
      },
    });
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

    return this.prisma.viewing.update({
      where: { id },
      data: { status: dto.status },
    });
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

    return this.prisma.viewing.update({
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
            owner: {
              select: { id: true, fullName: true, phone: true, email: true, profileImageUrl: true },
            },
          },
        },
      },
    });
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
