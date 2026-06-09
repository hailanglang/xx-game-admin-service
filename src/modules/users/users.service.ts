import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private prismaAdmin: PrismaAdminService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prismaAdmin.adminUser.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prismaAdmin.adminUser.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        email: dto.email,
        avatar: dto.avatar,
        roleId: dto.roleId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        status: true,
        roleId: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async findAll(query: QueryUserDto) {
    const { page = 1, pageSize = 20, username, status } = query;
    const where: any = {};
    if (username) where.username = { contains: username };
    if (status !== undefined) where.status = status;

    const [list, total] = await Promise.all([
      this.prismaAdmin.adminUser.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { role: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaAdmin.adminUser.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async findOne(id: number) {
    const user = await this.prismaAdmin.adminUser.findUnique({
      where: { id },
      include: { role: { select: { id: true, name: true } } },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prismaAdmin.adminUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const data: any = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prismaAdmin.adminUser.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        status: true,
        roleId: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async remove(id: number) {
    const user = await this.prismaAdmin.adminUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return this.prismaAdmin.adminUser.delete({ where: { id } });
  }
}