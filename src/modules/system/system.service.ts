import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service';
import { CreateSystemConfigDto } from './dto/create-system-config.dto';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { QueryLogDto } from './dto/query-log.dto';

@Injectable()
export class SystemService {
  constructor(private prismaAdmin: PrismaAdminService) {}

  // ─── 系统配置 ───

  async createConfig(dto: CreateSystemConfigDto) {
    const existing = await this.prismaAdmin.systemConfig.findUnique({
      where: { key: dto.key },
    });
    if (existing) {
      throw new ConflictException('配置键已存在');
    }
    return this.prismaAdmin.systemConfig.create({ data: dto as any });
  }

  async findAllConfigs() {
    return this.prismaAdmin.systemConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findConfigByKey(key: string) {
    const config = await this.prismaAdmin.systemConfig.findUnique({
      where: { key },
    });
    if (!config) {
      throw new NotFoundException('配置不存在');
    }
    return config;
  }

  async updateConfig(key: string, dto: UpdateSystemConfigDto) {
    const config = await this.prismaAdmin.systemConfig.findUnique({
      where: { key },
    });
    if (!config) {
      throw new NotFoundException('配置不存在');
    }
    return this.prismaAdmin.systemConfig.update({
      where: { key },
      data: dto as any,
    });
  }

  async deleteConfig(key: string) {
    const config = await this.prismaAdmin.systemConfig.findUnique({
      where: { key },
    });
    if (!config) {
      throw new NotFoundException('配置不存在');
    }
    return this.prismaAdmin.systemConfig.delete({ where: { key } });
  }

  // ─── 操作日志 ───

  async findAllLogs(query: QueryLogDto) {
    const { page = 1, pageSize = 20, action, adminUserId } = query;
    const where: any = {};
    if (action) where.action = action;
    if (adminUserId) where.adminUserId = adminUserId;

    const [list, total] = await Promise.all([
      this.prismaAdmin.operationLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          adminUser: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaAdmin.operationLog.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }
}