import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.property.findMany({
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
        price: dto.price,
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
      data: dto,
    });
  }
}
