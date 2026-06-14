import { Controller, Get } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGroupDto } from './dto/permission-group.dto';
import { PermissionItemDto } from './dto/permission-item.dto';

@Controller('api/permissions')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  /**
   * 获取所有权限列表（平铺）
   */
  @Get()
  @RequirePermission('system:config')
  async findAll(): Promise<PermissionItemDto[]> {
    return this.permissionsService.findAll();
  }

  /**
   * 获取按模块分组的权限列表
   */
  @Get('modules')
  @RequirePermission('system:config')
  async findGrouped(): Promise<PermissionGroupDto[]> {
    return this.permissionsService.findGrouped();
  }
}
