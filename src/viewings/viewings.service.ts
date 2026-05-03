import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ViewingStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateViewingDto } from './dto/create-viewing.dto';
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
        status: ViewingStatus.CONFIRMED,
      },
      include: {
        property: {
          include: {
            owner: {
              select: { id: true, fullName: true, phone: true, email: true },
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
              select: { id: true, fullName: true, phone: true, email: true },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
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
}
