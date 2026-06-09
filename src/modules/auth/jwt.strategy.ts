import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service';

interface JwtPayload {
  sub: number;
  roleId: number | null;
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prismaAdmin: PrismaAdminService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prismaAdmin.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, status: true, roleId: true },
    });

    if (!user || !user.status) {
      throw new UnauthorizedException('用户已被禁用或不存在');
    }

    return {
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      permissions: payload.permissions,
    };
  }
}