import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSavedPropertyDto } from './dto/create-saved-property.dto';

@Injectable()
export class SavedPropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertPropertyBookable(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property || !property.isActive) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  /** Idempotent save — no error if already saved. */
  async createIdempotent(userId: string, dto: CreateSavedPropertyDto) {
    await this.assertPropertyBookable(dto.propertyId);
    return this.prisma.savedProperty.upsert({
      where: {
        userId_propertyId: {
          userId,
          propertyId: dto.propertyId,
        },
      },
      create: {
        userId,
        propertyId: dto.propertyId,
      },
      update: {},
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

  /** Idempotent remove — ok if not saved. */
  async removeIdempotent(userId: string, propertyId: string) {
    await this.prisma.savedProperty.deleteMany({
      where: { userId, propertyId },
    });
    return { removed: true, propertyId };
  }

  findMine(userId: string) {
    return this.prisma.savedProperty.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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

  findAllForAdmin() {
    return this.prisma.savedProperty.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
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
            bedrooms: true,
            bathrooms: true,
            areaSqFt: true,
            propertyType: true,
            status: true,
          },
        },
      },
    });
  }
}
