import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateViewingDto } from './dto/create-viewing.dto';
import { UpdateViewingStatusDto } from './dto/update-viewing-status.dto';

@Injectable()
export class ViewingsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateViewingDto) {
    return this.prisma.viewing.create({
      data: {
        userId,
        propertyId: dto.propertyId,
        scheduledAt: new Date(dto.scheduledAt),
        notes: dto.notes,
      },
    });
  }

  findMy(userId: string) {
    return this.prisma.viewing.findMany({
      where: { userId },
      include: {
        property: {
          select: { id: true, title: true, city: true, price: true },
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
