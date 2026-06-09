import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service.js';

@Module({
  controllers: [RolesController],
  providers: [RolesService, PrismaAdminService],
  exports: [RolesService],
})
export class RolesModule {}