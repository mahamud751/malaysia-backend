import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ViewingStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateAgentReviewDto } from './dto/create-agent-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByViewing(viewingId: string, userId: string) {
    const viewing = await this.prisma.viewing.findUnique({
      where: { id: viewingId },
      include: { property: { select: { ownerId: true } } },
    });
    if (!viewing) {
      throw new NotFoundException('Viewing not found');
    }
    if (viewing.userId !== userId && viewing.property.ownerId !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    return this.prisma.agentReview.findUnique({
      where: { viewingId },
      include: {
        reviewer: {
          select: { id: true, fullName: true, profileImageUrl: true },
        },
        agent: {
          select: { id: true, fullName: true, profileImageUrl: true },
        },
        property: { select: { id: true, title: true } },
      },
    });
  }

  async create(reviewerId: string, dto: CreateAgentReviewDto) {
    const body = dto.body?.trim();
    if (!body) {
      throw new BadRequestException('Review text is required');
    }

    const viewing = await this.prisma.viewing.findUnique({
      where: { id: dto.viewingId },
      include: {
        property: {
          select: { id: true, title: true, ownerId: true },
        },
      },
    });
    if (!viewing) {
      throw new NotFoundException('Viewing not found');
    }
    if (viewing.userId !== reviewerId) {
      throw new ForbiddenException('Only the client can review this viewing');
    }
    if (viewing.status !== ViewingStatus.COMPLETED) {
      throw new BadRequestException('You can only review completed viewings');
    }

    const existing = await this.prisma.agentReview.findUnique({
      where: { viewingId: dto.viewingId },
    });
    if (existing) {
      throw new ConflictException('You already reviewed this viewing');
    }

    return this.prisma.agentReview.create({
      data: {
        viewingId: dto.viewingId,
        reviewerId,
        agentId: viewing.property.ownerId,
        propertyId: viewing.property.id,
        rating: dto.rating,
        body,
      },
      include: {
        reviewer: {
          select: { id: true, fullName: true, profileImageUrl: true },
        },
        agent: {
          select: { id: true, fullName: true, profileImageUrl: true },
        },
        property: { select: { id: true, title: true } },
      },
    });
  }

  listForAgent(agentId: string, limit = 50) {
    return this.prisma.agentReview.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      include: {
        reviewer: {
          select: { fullName: true, profileImageUrl: true },
        },
        property: { select: { title: true } },
      },
    });
  }
}
