import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export type NotificationData = {
  route?: 'viewing' | 'chat' | 'property';
  viewingId?: string;
  threadId?: string;
  propertyId?: string;
  propertyTitle?: string;
  status?: string;
};

export type CreateNotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(id: string, userId: string) {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    if (row.userId !== userId) {
      throw new ForbiddenException('Not allowed');
    }
    if (row.readAt) {
      return row;
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  notifyUser(userId: string, payload: CreateNotificationInput) {
    if (!userId) return Promise.resolve(null);
    return this.prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: (payload.data ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async notifyUsers(userIds: string[], payload: CreateNotificationInput) {
    const unique = [...new Set(userIds.filter(Boolean))];
    await Promise.all(unique.map(userId => this.notifyUser(userId, payload)));
  }

  async notifyAdmins(payload: CreateNotificationInput) {
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    await this.notifyUsers(
      admins.map(a => a.id),
      payload,
    );
  }
}
