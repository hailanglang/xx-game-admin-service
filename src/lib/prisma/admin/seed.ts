

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../../prisma-admin-database/admin-database-client-types/client.js';
import * as bcrypt from 'bcrypt';

const connectionString = `${process.env.ADMIN_DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const permissions = [
  // 文章
  { code: 'article:create', name: '创建文章', module: 'article', action: 'create' },
  { code: 'article:read',   name: '查看文章', module: 'article', action: 'read' },
  { code: 'article:update', name: '编辑文章', module: 'article', action: 'update' },
  { code: 'article:delete', name: '删除文章', module: 'article', action: 'delete' },
  // 用户
  { code: 'user:create',    name: '创建用户', module: 'user', action: 'create' },
  { code: 'user:read',      name: '查看用户', module: 'user', action: 'read' },
  { code: 'user:update',    name: '编辑用户', module: 'user', action: 'update' },
  { code: 'user:delete',    name: '删除用户', module: 'user', action: 'delete' },
  // 角色
  { code: 'role:create',    name: '创建角色', module: 'role', action: 'create' },
  { code: 'role:read',      name: '查看角色', module: 'role', action: 'read' },
  { code: 'role:update',    name: '编辑角色', module: 'role', action: 'update' },
  { code: 'role:delete',    name: '删除角色', module: 'role', action: 'delete' },
  { code: 'role:assign',    name: '分配权限', module: 'role', action: 'assign' },
  // 系统
  { code: 'system:config',  name: '系统配置', module: 'system', action: 'config' },
  { code: 'system:logs',    name: '查看日志', module: 'system', action: 'logs' },
];

async function main() {
  console.log('🌱 Seeding admin database...');

  // 1. 创建权限点
  const createdPermissions = await Promise.all(
    permissions.map((p) =>
      prisma.permission.upsert({
        where: { code: p.code },
        update: { name: p.name, module: p.module, action: p.action },
        create: p,
      }),
    ),
  );
  console.log(`  ✓ Created ${createdPermissions.length} permissions`);

  // 2. 创建超级管理员角色
  const superRole = await prisma.role.upsert({
    where: { name: '超级管理员' },
    update: { isSystem: true },
    create: {
      name: '超级管理员',
      description: '系统内置角色，拥有所有权限',
      isSystem: true,
    },
  });
  console.log(`  ✓ Created role: ${superRole.name}`);

  // 3. 关联所有权限到超级管理员角色
  await prisma.rolePermission.deleteMany({ where: { roleId: superRole.id } });
  await prisma.rolePermission.createMany({
    data: createdPermissions.map((p) => ({
      roleId: superRole.id,
      permissionId: p.id,
    })),
  });
  console.log(`  ✓ Assigned ${createdPermissions.length} permissions to super admin role`);

  // 4. 创建默认超级管理员用户
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: { roleId: superRole.id },
    create: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@xxgame.com',
      roleId: superRole.id,
    },
  });
  console.log(`  ✓ Created admin user: ${adminUser.username}`);

  console.log('✅ Seed completed');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });