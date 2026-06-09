import { Injectable } from '@nestjs/common';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service.js';

@Injectable()
export class PermissionsService {
  constructor(private prismaAdmin: PrismaAdminService) {}

  async findAll() {
    return this.prismaAdmin.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  async findByModule(module: string) {
    return this.prismaAdmin.permission.findMany({
      where: { module },
      orderBy: { action: 'asc' },
    });
  }
}