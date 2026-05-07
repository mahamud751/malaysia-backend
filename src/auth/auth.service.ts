import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        passwordHash,
        phone: dto.phone,
        role: dto.role ?? UserRole.USER,
      },
    });

    return this.signUser(user.id);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signUser(user.id);
  }

  private async signUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        agencyName: true,
        cityOrArea: true,
        reraLicenseNumber: true,
        profileImageUrl: true,
        about: true,
        responseTime: true,
        languages: true,
        specializations: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const expiresRaw =
      this.configService.get<string>('JWT_EXPIRES_IN') ?? ('7d' as const);
    const signOptions: JwtSignOptions = {
      secret: this.configService.get<string>('JWT_SECRET')!,
      expiresIn: expiresRaw as JwtSignOptions['expiresIn'],
    };
    const accessToken = await this.jwtService.signAsync(payload, signOptions);

    return {
      accessToken,
      tokenType: 'Bearer',
      user,
    };
  }
}
