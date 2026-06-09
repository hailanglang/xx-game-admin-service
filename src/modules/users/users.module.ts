import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaAdminService],
  exports: [UsersService],
})
export class UsersModule {}