import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('api/roles')
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