import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaAdminService],
  exports: [UsersService],
})
export class UsersModule {}