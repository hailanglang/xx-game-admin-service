import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { CreateSystemConfigDto } from './dto/create-system-config.dto';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { QueryLogDto } from './dto/query-log.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('api/system')
export class SystemController {
  constructor(private systemService: SystemService) {}

  /**
   * 创建系统配置
   */
  @Post('configs')
  @RequirePermission('system:config')
  createConfig(@Body() dto: CreateSystemConfigDto) {
    return this.systemService.createConfig(dto);
  }

  /**
   * 获取系统配置列表
   */
  @Get('configs')
  @RequirePermission('system:config')
  findAllConfigs() {
    return this.systemService.findAllConfigs();
  }

  /**
   * 获取系统配置详情（按 key）
   */
  @Get('configs/:key')
  @RequirePermission('system:config')
  findConfigByKey(@Param('key') key: string) {
    return this.systemService.findConfigByKey(key);
  }

  /**
   * 更新系统配置
   */
  @Put('configs/:key')
  @RequirePermission('system:config')
  updateConfig(@Param('key') key: string, @Body() dto: UpdateSystemConfigDto) {
    return this.systemService.updateConfig(key, dto);
  }

  /**
   * 删除系统配置
   */
  @Delete('configs/:key')
  @RequirePermission('system:config')
  deleteConfig(@Param('key') key: string) {
    return this.systemService.deleteConfig(key);
  }

  /**
   * 获取操作日志列表
   */
  @Get('logs')
  @RequirePermission('system:logs')
  findAllLogs(@Query() query: QueryLogDto) {
    return this.systemService.findAllLogs(query);
  }
}