import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('api/users')
@UseGuards(AuthGuard, PermissionGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @RequirePermission('user:create')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @RequirePermission('user:read')
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('user:read')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Put(':id')
  @RequirePermission('user:update')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(+id, dto);
  }

  @Delete(':id')
  @RequirePermission('user:delete')
  remove(@Param('id') id: string, @CurrentUser('id') currentUserId: number) {
    if (+id === currentUserId) {
      throw new BadRequestException('不能删除自己的账号');
    }
    return this.usersService.remove(+id);
  }
}