import { Module } from '@nestjs/common';
import { SystemController } from './system.controller.js';
import { SystemService } from './system.service.js';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service.js';

@Module({
  controllers: [SystemController],
  providers: [SystemService, PrismaAdminService],
})
export class SystemModule {}