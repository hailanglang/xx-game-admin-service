import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { RoleDto } from './dto/role.dto';
import { RoleDetailDto } from './dto/role-detail.dto';

@Injectable()
export class RolesService {
  constructor(private prismaAdmin: PrismaAdminService) {}

  async create(dto: CreateRoleDto): Promise<RoleDto> {
    const existing = await this.prismaAdmin.role.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('角色名已存在');
    }
    return this.prismaAdmin.role.create({
      data: dto,
      select: { id: true, name: true, description: true, isSystem: true, createdAt: true, updatedAt: true },
    });
  }

  async findAll(): Promise<RoleDetailDto[]> {
    const roles = await this.prismaAdmin.role.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return roles.map((role) => this.mapToDetailDto(role));
  }

  async findOne(id: number): Promise<RoleDetailDto> {
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
    return this.mapToDetailDto(role);
  }

  async update(id: number, dto: Partial<CreateRoleDto>): Promise<RoleDto> {
    const role = await this.prismaAdmin.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    if (role.isSystem) {
      throw new BadRequestException('系统角色不可修改');
    }
    return this.prismaAdmin.role.update({
      where: { id },
      data: dto,
      select: { id: true, name: true, description: true, isSystem: true, createdAt: true, updatedAt: true },
    });
  }

  async remove(id: number): Promise<RoleDto> {
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
    return this.prismaAdmin.role.delete({
      where: { id },
      select: { id: true, name: true, description: true, isSystem: true, createdAt: true, updatedAt: true },
    });
  }

  async assignPermissions(id: number, dto: AssignPermissionDto): Promise<RoleDetailDto> {
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

  private mapToDetailDto(role: any): RoleDetailDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions ?? [],
      userCount: role._count?.users ?? 0,
    };
  }
}