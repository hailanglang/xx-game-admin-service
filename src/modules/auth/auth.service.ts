import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { UserInfoDto } from './dto/user-info.dto';

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
      currentUser: this.buildUserInfo(user, permissions),
    };
  }

  async getCurrentUser(userId: number): Promise<UserInfoDto> {
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

    return this.buildUserInfo(user, permissions);
  }

  private buildUserInfo(
    user: { id: number; username: string; email?: string | null; avatar?: string | null; roleId?: number | null; role?: { name?: string | null } | null },
    permissions: string[],
  ): UserInfoDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email ?? '',
      avatar: user.avatar ?? '',
      roleId: user.roleId ?? -1,
      roleName: user.role?.name ?? '',
      permissions,
    };
  }
}