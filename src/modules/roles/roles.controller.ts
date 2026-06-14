import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('api/roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  /**
   * 创建角色
   */
  @Post()
  @RequirePermission('role:create')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  /**
   * 获取角色列表
   */
  @Get()
  @RequirePermission('role:read')
  findAll() {
    return this.rolesService.findAll();
  }

  /**
   * 获取角色详情
   */
  @Get(':id')
  @RequirePermission('role:read')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(+id);
  }

  /**
   * 更新角色
   */
  @Put(':id')
  @RequirePermission('role:update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateRoleDto>) {
    return this.rolesService.update(+id, dto);
  }

  /**
   * 删除角色
   */
  @Delete(':id')
  @RequirePermission('role:delete')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(+id);
  }

  /**
   * 分配角色权限
   */
  @Post(':id/permissions')
  @RequirePermission('role:assign')
  assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionDto) {
    return this.rolesService.assignPermissions(+id, dto);
  }
}