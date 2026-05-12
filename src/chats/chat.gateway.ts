import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatsService } from './chats.service';

type JwtPayload = { sub: string };

@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatsService: ChatsService,
  ) {}

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth &&
        (client.handshake.auth as { token?: string }).token) ||
      client.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
      '';

    if (!token || typeof token !== 'string') {
      this.logger.warn('Socket connection rejected: no token');
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (!payload?.sub) {
        throw new Error('Invalid payload');
      }
      (client.data as { userId?: string }).userId = payload.sub;
    } catch (e) {
      this.logger.warn(`Socket JWT invalid: ${(e as Error).message}`);
      client.disconnect(true);
    }
  }

  @SubscribeMessage('joinThread')
  async joinThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { threadId?: string },
  ) {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId) {
      return { ok: false, error: 'Unauthorized' };
    }
    const threadId = body?.threadId;
    if (!threadId) {
      return { ok: false, error: 'threadId required' };
    }
    try {
      const role = await this.chatsService.getUserRoleForChat(userId);
      await this.chatsService.assertThreadMember(threadId, userId, role);
      await client.join(this.roomName(threadId));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      threadId?: string;
      body?: string;
      messageType?: 'text' | 'image' | 'file' | 'voice';
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentMime?: string;
      attachmentSizeBytes?: number;
      durationSec?: number;
    },
  ) {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId) {
      return { ok: false, error: 'Unauthorized' };
    }
    const threadId = body?.threadId;
    if (!threadId) {
      return { ok: false, error: 'threadId required' };
    }
    try {
      const msg = await this.chatsService.createMessage(threadId, userId, {
        body: body.body,
        messageType: body.messageType,
        attachmentUrl: body.attachmentUrl,
        attachmentName: body.attachmentName,
        attachmentMime: body.attachmentMime,
        attachmentSizeBytes: body.attachmentSizeBytes,
        durationSec: body.durationSec,
      });
      this.server.to(this.roomName(threadId)).emit('newMessage', msg);
      return { ok: true, message: msg };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  private roomName(threadId: string) {
    return `thread:${threadId}`;
  }
}
