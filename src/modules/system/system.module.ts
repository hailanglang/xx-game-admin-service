import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service';

@Module({
  controllers: [SystemController],
  providers: [SystemService, PrismaAdminService],
})
export class SystemModule {}