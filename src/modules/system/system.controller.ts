import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service.js';
import { CreateSystemConfigDto } from './dto/create-system-config.dto.js';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto.js';
import { QueryLogDto } from './dto/query-log.dto.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';

@Controller('api/system')
@UseGuards(AuthGuard, PermissionGuard)
export class SystemController {
  constructor(private systemService: SystemService) {}

  // ─── 系统配置 ───
  @Post('configs')
  @RequirePermission('system:config')
  createConfig(@Body() dto: CreateSystemConfigDto) {
    return this.systemService.createConfig(dto);
  }

  @Get('configs')
  @RequirePermission('system:config')
  findAllConfigs() {
    return this.systemService.findAllConfigs();
  }

  @Get('configs/:key')
  @RequirePermission('system:config')
  findConfigByKey(@Param('key') key: string) {
    return this.systemService.findConfigByKey(key);
  }

  @Put('configs/:key')
  @RequirePermission('system:config')
  updateConfig(@Param('key') key: string, @Body() dto: UpdateSystemConfigDto) {
    return this.systemService.updateConfig(key, dto);
  }

  @Delete('configs/:key')
  @RequirePermission('system:config')
  deleteConfig(@Param('key') key: string) {
    return this.systemService.deleteConfig(key);
  }

  // ─── 操作日志 ───
  @Get('logs')
  @RequirePermission('system:logs')
  findAllLogs(@Query() query: QueryLogDto) {
    return this.systemService.findAllLogs(query);
  }
}