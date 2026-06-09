import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service';

@Module({
  controllers: [RolesController],
  providers: [RolesService, PrismaAdminService],
  exports: [RolesService],
})
export class RolesModule {}