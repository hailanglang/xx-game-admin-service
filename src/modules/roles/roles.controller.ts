import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { AssignPermissionDto } from './dto/assign-permission.dto.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';

@Controller('api/roles')
@UseGuards(AuthGuard, PermissionGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Post()
  @RequirePermission('role:create')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  @RequirePermission('role:read')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermission('role:read')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(+id);
  }

  @Put(':id')
  @RequirePermission('role:update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateRoleDto>) {
    return this.rolesService.update(+id, dto);
  }

  @Delete(':id')
  @RequirePermission('role:delete')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(+id);
  }

  @Post(':id/permissions')
  @RequirePermission('role:assign')
  assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionDto) {
    return this.rolesService.assignPermissions(+id, dto);
  }
}