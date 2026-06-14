import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService, PrismaAdminService],
})
export class PermissionsModule {}
