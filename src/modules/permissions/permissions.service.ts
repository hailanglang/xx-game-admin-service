import { Injectable } from '@nestjs/common';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service';
import { PermissionItemDto } from './dto/permission-item.dto';
import { PermissionGroupDto } from './dto/permission-group.dto';

const MODULE_NAMES: Record<string, string> = {
  article: '文章',
  user: '用户',
  role: '角色',
  system: '系统',
};

@Injectable()
export class PermissionsService {
  constructor(private prismaAdmin: PrismaAdminService) {}

  async findAll(): Promise<PermissionItemDto[]> {
    return this.prismaAdmin.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  async findByModule(module: string): Promise<PermissionItemDto[]> {
    return this.prismaAdmin.permission.findMany({
      where: { module },
      orderBy: { action: 'asc' },
    });
  }

  async findGrouped(): Promise<PermissionGroupDto[]> {
    const permissions = await this.findAll();
    const moduleMap = new Map<string, PermissionItemDto[]>();

    for (const perm of permissions) {
      const list = moduleMap.get(perm.module) || [];
      list.push(perm);
      moduleMap.set(perm.module, list);
    }

    return Array.from(moduleMap.entries()).map(([module, perms]) => ({
      module,
      moduleName: MODULE_NAMES[module] || module,
      permissions: perms,
    }));
  }
}
