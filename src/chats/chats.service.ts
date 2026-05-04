import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const MAX_MESSAGE_LEN = 4000;

export type ChatMessagePayload = {
  body?: string;
  messageType?: 'text' | 'image' | 'file' | 'voice';
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
  attachmentSizeBytes?: number;
  durationSec?: number;
};

function inboxPreview(m: {
  body: string;
  messageType: string;
  attachmentName: string | null;
}): string {
  switch (m.messageType) {
    case 'image':
      return '📷 Photo';
    case 'voice':
      return '🎤 Voice message';
    case 'file':
      return m.attachmentName ? `📎 ${m.attachmentName}` : '📎 File';
    default:
      return m.body || '';
  }
}

@Injectable()
export class ChatsService {
  constructor(private readonly prisma: PrismaService) {}

  async joinOrCreatePropertyThread(userId: string, propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImageUrl: true,
            phone: true,
          },
        },
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.ownerId === userId) {
      throw new BadRequestException(
        'Listing owners can reply from the Messages tab when a buyer writes to you.',
      );
    }

    const thread = await this.prisma.propertyChatThread.upsert({
      where: {
        propertyId_clientId: { propertyId, clientId: userId },
      },
      create: {
        propertyId,
        clientId: userId,
        ownerId: property.ownerId,
      },
      update: {},
    });

    const [client, messageCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          profileImageUrl: true,
        },
      }),
      this.prisma.propertyChatMessage.count({
        where: { threadId: thread.id },
      }),
    ]);

    return {
      threadId: thread.id,
      property: {
        id: property.id,
        title: property.title,
        city: property.city,
        currency: property.currency,
        price: property.price.toString(),
        imageUrls: property.imageUrls ?? [],
      },
      owner: property.owner,
      client,
      messageCount,
    };
  }

  async getThreadContext(threadId: string, userId: string) {
    const thread = await this.prisma.propertyChatThread.findUnique({
      where: { id: threadId },
      include: {
        property: true,
        client: {
          select: { id: true, fullName: true, profileImageUrl: true },
        },
        owner: {
          select: { id: true, fullName: true, profileImageUrl: true, email: true, phone: true },
        },
      },
    });
    if (!thread) {
      throw new NotFoundException('Chat thread not found');
    }
    if (thread.clientId !== userId && thread.ownerId !== userId) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    const p = thread.property;
    const messageCount = await this.prisma.propertyChatMessage.count({
      where: { threadId: thread.id },
    });

    return {
      threadId: thread.id,
      property: {
        id: p.id,
        title: p.title,
        city: p.city,
        currency: p.currency,
        price: p.price.toString(),
        imageUrls: p.imageUrls ?? [],
      },
      owner: thread.owner,
      client: thread.client,
      messageCount,
    };
  }

  async listMyThreads(userId: string) {
    const rows = await this.prisma.propertyChatThread.findMany({
      where: {
        OR: [{ clientId: userId }, { ownerId: userId }],
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            currency: true,
            price: true,
            imageUrls: true,
          },
        },
        client: { select: { id: true, fullName: true, profileImageUrl: true } },
        owner: { select: { id: true, fullName: true, profileImageUrl: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            body: true,
            createdAt: true,
            senderId: true,
            messageType: true,
            attachmentName: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      threadId: row.id,
      property: {
        id: row.property.id,
        title: row.property.title,
        city: row.property.city,
        currency: row.property.currency,
        price: row.property.price.toString(),
        imageUrls: row.property.imageUrls ?? [],
      },
      peer:
        row.clientId === userId
          ? row.owner
          : row.client,
      lastMessage: row.messages[0]
        ? {
            body: inboxPreview(row.messages[0]),
            messageType: row.messages[0].messageType,
            createdAt: row.messages[0].createdAt,
          }
        : null,
      updatedAt: row.updatedAt,
    }));
  }

  async assertThreadMember(threadId: string, userId: string) {
    const thread = await this.prisma.propertyChatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) {
      throw new NotFoundException('Chat thread not found');
    }
    if (thread.clientId !== userId && thread.ownerId !== userId) {
      throw new ForbiddenException('You are not part of this conversation');
    }
    return thread;
  }

  async listMessages(threadId: string, userId: string) {
    await this.assertThreadMember(threadId, userId);
    return this.prisma.propertyChatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        sender: {
          select: { id: true, fullName: true, profileImageUrl: true },
        },
      },
    });
  }

  async createMessage(
    threadId: string,
    senderId: string,
    payload: string | ChatMessagePayload,
  ) {
    const input: ChatMessagePayload =
      typeof payload === 'string'
        ? { body: payload, messageType: 'text' }
        : { ...payload };

    const messageType = input.messageType ?? 'text';
    const body = (input.body ?? '').trim();

    if (messageType === 'text') {
      if (!body) {
        throw new BadRequestException('Message cannot be empty');
      }
      if (body.length > MAX_MESSAGE_LEN) {
        throw new BadRequestException(`Message too long (max ${MAX_MESSAGE_LEN} characters)`);
      }
    } else {
      const url = input.attachmentUrl?.trim();
      if (!url) {
        throw new BadRequestException('Attachment URL is required for this message type');
      }
      if (body.length > MAX_MESSAGE_LEN) {
        throw new BadRequestException(`Caption too long (max ${MAX_MESSAGE_LEN} characters)`);
      }
    }

    await this.assertThreadMember(threadId, senderId);

    const msg = await this.prisma.propertyChatMessage.create({
      data: {
        threadId,
        senderId,
        body,
        messageType,
        attachmentUrl: input.attachmentUrl?.trim() || null,
        attachmentName: input.attachmentName?.trim() || null,
        attachmentMime: input.attachmentMime?.trim() || null,
        attachmentSizeBytes:
          typeof input.attachmentSizeBytes === 'number' ? input.attachmentSizeBytes : null,
        durationSec: typeof input.durationSec === 'number' ? input.durationSec : null,
      },
      include: {
        sender: {
          select: { id: true, fullName: true, profileImageUrl: true },
        },
      },
    });

    await this.prisma.propertyChatThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    return msg;
  }
}
