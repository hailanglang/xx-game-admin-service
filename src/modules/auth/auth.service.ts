import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private prismaAdmin: PrismaAdminService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto, ip?: string, userAgent?: string): Promise<LoginResponseDto> {
    const user = await this.prismaAdmin.adminUser.findUnique({
      where: { username: loginDto.username },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (!user.status) {
      throw new UnauthorizedException('账号已被禁用');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const permissions = user.role?.permissions.map((rp) => rp.permission.code) || [];

    const payload = {
      sub: user.id,
      roleId: user.roleId,
      permissions,
    };

    const token = this.jwtService.sign(payload);

    // 更新最后登录时间
    await this.prismaAdmin.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 记录操作日志
    await this.prismaAdmin.operationLog.create({
      data: {
        adminUserId: user.id,
        action: 'LOGIN',
        ip,
        userAgent,
      },
    });

    return {
      token,
      currentUser: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        roleId: user.roleId,
        roleName: user.role?.name || null,
        permissions,
      },
    };
  }

  async getCurrentUser(userId: number) {
    const user = await this.prismaAdmin.adminUser.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const permissions = user.role?.permissions.map((rp) => rp.permission.code) || [];

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      roleId: user.roleId,
      roleName: user.role?.name || null,
      permissions,
    };
  }
}