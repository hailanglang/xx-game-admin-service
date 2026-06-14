import { Controller, Get } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionGroupDto } from './dto/permission-group.dto';
import { PermissionItemDto } from './dto/permission-item.dto';

@Controller('api/permissions')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  /**
   * 获取所有权限列表（平铺）
   */
  @Get()
  @RequirePermission('role:assign')
  async findAll(
    @CurrentUser('permissions') permissions: string[],
  ): Promise<PermissionItemDto[]> {
    return this.permissionsService.findAll(permissions);
  }

  /**
   * 获取按模块分组的权限列表
   */
  @Get('modules')
  @RequirePermission('role:assign')
  async findGrouped(
    @CurrentUser('permissions') permissions: string[],
  ): Promise<PermissionGroupDto[]> {
    return this.permissionsService.findGrouped(permissions);
  }
}
