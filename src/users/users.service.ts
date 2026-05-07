import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
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
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
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
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role,
      },
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
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
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
  }
}
