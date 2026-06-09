import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { AssignPermissionDto } from './dto/assign-permission.dto.js';

@Injectable()
export class RolesService {
  constructor(private prismaAdmin: PrismaAdminService) {}

  async create(dto: CreateRoleDto) {
    const existing = await this.prismaAdmin.role.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('角色名已存在');
    }
    return this.prismaAdmin.role.create({ data: dto });
  }

  async findAll() {
    return this.prismaAdmin.role.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const role = await this.prismaAdmin.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
    });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    return role;
  }

  async update(id: number, dto: Partial<CreateRoleDto>) {
    const role = await this.prismaAdmin.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    if (role.isSystem) {
      throw new BadRequestException('系统角色不可修改');
    }
    return this.prismaAdmin.role.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const role = await this.prismaAdmin.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    if (role.isSystem) {
      throw new BadRequestException('系统角色不可删除');
    }
    if (role._count.users > 0) {
      throw new BadRequestException('该角色下仍有用户，无法删除');
    }
    return this.prismaAdmin.role.delete({ where: { id } });
  }

  async assignPermissions(id: number, dto: AssignPermissionDto) {
    const role = await this.prismaAdmin.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    // 删除旧的关联
    await this.prismaAdmin.rolePermission.deleteMany({
      where: { roleId: id },
    });

    // 创建新的关联
    await this.prismaAdmin.rolePermission.createMany({
      data: dto.permissionIds.map((permissionId) => ({
        roleId: id,
        permissionId,
      })),
    });

    return this.findOne(id);
  }
}