# 管理后台数据库重构设计

> 基于现有 `prisma-admin-database` 重构，将全部后台数据统一存放到该数据库。

**日期:** 2026-06-08
**状态:** 已批准

---

## 架构概览

**原方案：** 双数据源（RDS + Supabase），Prisma 管理自有 + 共享两个 Schema

**调整后：** 单一管理后台数据库 `prisma-admin-database`，仅包含 Admin 相关数据模型，删除共享数据源和 Articles 模块。

```
┌─────────────────────┐
│   xx-game-admin-    │
│   service           │
│                     │
│  ┌───────────────┐  │     ┌──────────────────┐
│  │ Auth Module   │──┼─────│  PostgreSQL       │
│  │ Users Module  │──┼─────│  (阿里云 RDS)     │
│  │ Roles Module  │──┼─────│                   │
│  │ System Module │──┼─────│  admin_users      │
│  └───────────────┘  │     │  roles            │
│                     │     │  permissions      │
│  ┌───────────────┐  │     │  role_permissions │
│  │ PrismaAdmin   │──┼─────│  system_configs   │
│  │ Service       │  │     │  operation_logs   │
│  └───────────────┘  │     └──────────────────┘
└─────────────────────┘
```

## 文件清单

| 文件 | 操作 | 职责 |
|------|------|------|
| `prisma-admin-database/schema.prisma` | **重写** | 替换 demo User/Post 为 admin 6 表 |
| `prisma-admin-database/prisma.config.ts` | 保留 | 路径已正确配置 |
| `src/prisma/admin/prisma-admin.service.ts` | **新建** | 封装 PrismaClient 为 NestJS Service |
| `src/lib/prisma/admin.ts` | **删除** | 旧入口，迁移到正式 Service |
| `src/lib/script.ts` | 保留 | demo 脚本可清理 |
| `src/common/interfaces/response.interface.ts` | **新建** | 统一响应类型 |
| `src/common/interceptors/transform.interceptor.ts` | **新建** | 统一成功响应包装 |
| `src/common/filters/http-exception.filter.ts` | **新建** | 统一错误响应 |
| `src/common/dto/pagination.dto.ts` | **新建** | 分页通用 DTO |
| `src/common/guards/auth.guard.ts` | **新建** | JWT 认证守卫 |
| `src/common/guards/permission.guard.ts` | **新建** | 权限校验守卫 |
| `src/common/decorators/current-user.decorator.ts` | **新建** | 获取当前用户 |
| `src/common/decorators/require-permission.decorator.ts` | **新建** | 声明所需权限 |
| `src/common/decorators/public.decorator.ts` | **新建** | 标记公开接口 |
| `src/modules/auth/auth.module.ts` | **新建** | 认证模块 |
| `src/modules/auth/auth.controller.ts` | **新建** | 登录/当前用户 API |
| `src/modules/auth/auth.service.ts` | **新建** | 认证业务逻辑 |
| `src/modules/auth/dto/login.dto.ts` | **新建** | 登录请求 DTO |
| `src/modules/auth/dto/login-response.dto.ts` | **新建** | 登录响应 DTO |
| `src/modules/auth/jwt.strategy.ts` | **新建** | JWT Passport 策略 |
| `src/modules/users/users.module.ts` | **新建** | 管理员 CRUD 模块 |
| `src/modules/users/users.controller.ts` | **新建** | 管理员 CRUD API |
| `src/modules/users/users.service.ts` | **新建** | 管理员业务逻辑 |
| `src/modules/users/dto/create-user.dto.ts` | **新建** | 创建管理员 DTO |
| `src/modules/users/dto/update-user.dto.ts` | **新建** | 更新管理员 DTO |
| `src/modules/users/dto/query-user.dto.ts` | **新建** | 管理员查询 DTO |
| `src/modules/roles/roles.module.ts` | **新建** | 角色管理模块 |
| `src/modules/roles/roles.controller.ts` | **新建** | 角色 CRUD + 权限分配 API |
| `src/modules/roles/roles.service.ts` | **新建** | 角色业务逻辑 |
| `src/modules/roles/dto/create-role.dto.ts` | **新建** | 创建角色 DTO |
| `src/modules/roles/dto/assign-permission.dto.ts` | **新建** | 分配权限 DTO |
| `src/modules/permissions/permissions.service.ts` | **新建** | 权限查询服务 |
| `src/modules/system/system.module.ts` | **新建** | 系统管理模块 |
| `src/modules/system/system.controller.ts` | **新建** | 配置/日志 API |
| `src/modules/system/system.service.ts` | **新建** | 系统业务逻辑 |
| `src/modules/system/dto/create-system-config.dto.ts` | **新建** | 创建配置 DTO |
| `src/modules/system/dto/update-system-config.dto.ts` | **新建** | 更新配置 DTO |
| `src/modules/system/dto/query-log.dto.ts` | **新建** | 日志查询 DTO |
| `prisma/admin/seed.ts` | **新建** | 权限 Seed + 默认管理员 |
| `src/main.ts` | **修改** | 添加 ValidationPipe、CORS、全局过滤器/拦截器 |
| `src/app.module.ts` | **重写** | 注册所有模块 + 全局 Guards |
| `src/app.controller.ts` | 保留 | 不变 |
| `src/app.service.ts` | 保留 | 不变 |
| `src/dto/login.dto.ts` | **删除** | 已移至 auth 模块 |
| `package.json` | **修改** | 添加 seed 命令 |

## Schema：prisma-admin-database

### 6 张表设计

```prisma
generator client {
  provider = "prisma-client"
  output   = "admin-database-client-types"
}

datasource db {
  provider = "postgresql"
  url      = env("ADMIN_DATABASE_URL")
}

model AdminUser {
  id            Int       @id @default(autoincrement())
  username      String    @unique @db.VarChar(50)
  password      String    @db.Text
  email         String?   @db.VarChar(255)
  avatar        String?   @db.Text
  status        Boolean   @default(true)
  roleId        Int?
  role          Role?     @relation(fields: [roleId], references: [id])
  lastLoginAt   DateTime? @map("last_login_at") @db.Timestamptz()
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz()
  operationLogs OperationLog[]
  @@map("admin_users")
}

model Role {
  id          Int       @id @default(autoincrement())
  name        String    @unique @db.VarChar(50)
  description String?   @db.Text
  isSystem    Boolean   @default(false) @map("is_system")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz()
  users       AdminUser[]
  permissions RolePermission[]
  @@map("roles")
}

model Permission {
  id          Int       @id @default(autoincrement())
  code        String    @unique @db.VarChar(100)
  name        String    @db.VarChar(100)
  description String?   @db.Text
  module      String    @db.VarChar(50)
  action      String    @db.VarChar(50)
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  roles       RolePermission[]
  @@map("permissions")
}

model RolePermission {
  roleId       Int
  permissionId Int
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@id([roleId, permissionId])
  @@map("role_permissions")
}

model SystemConfig {
  id          Int      @id @default(autoincrement())
  key         String   @unique @db.VarChar(100)
  value       Json     @db.JsonB
  description String?  @db.Text
  isEncrypted Boolean  @default(false) @map("is_encrypted")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz()
  @@map("system_configs")
}

model OperationLog {
  id          Int        @id @default(autoincrement())
  adminUserId Int?       @map("admin_user_id")
  adminUser   AdminUser? @relation(fields: [adminUserId], references: [id], onDelete: SetNull)
  action      String     @db.VarChar(50)
  targetType  String?    @db.VarChar(50)  @map("target_type")
  targetId    Int?       @map("target_id")
  detail      Json?      @db.JsonB
  ip          String?    @db.VarChar(50)
  userAgent   String?    @map("user_agent") @db.Text
  createdAt   DateTime   @default(now()) @map("created_at") @db.Timestamptz()
  @@index([adminUserId])
  @@index([action, createdAt(sort: Desc)])
  @@map("operation_logs")
}
```

### 表关系

```
AdminUser ──N:1──→ Role ──1:N──→ RolePermission ──N:1──→ Permission
AdminUser ──1:N──→ OperationLog
SystemConfig（独立）
```

## API 端点总览

| 模块 | 端点 | 方法 | 权限 | 说明 |
|------|------|------|------|------|
| Auth | `/api/auth/login` | POST | 公开 | 登录获取 JWT |
| Auth | `/api/auth/currentUser` | GET | 认证 | 当前用户信息+权限 |
| Users | `/api/users` | POST | `user:create` | 创建管理员 |
| Users | `/api/users` | GET | `user:read` | 分页列表 |
| Users | `/api/users/:id` | GET | `user:read` | 详情 |
| Users | `/api/users/:id` | PUT | `user:update` | 更新 |
| Users | `/api/users/:id` | DELETE | `user:delete` | 删除（不可自删） |
| Roles | `/api/roles` | POST | `role:create` | 创建角色 |
| Roles | `/api/roles` | GET | `role:read` | 列表 |
| Roles | `/api/roles/:id` | GET | `role:read` | 详情（含权限） |
| Roles | `/api/roles/:id` | PUT | `role:update` | 修改 |
| Roles | `/api/roles/:id` | DELETE | `role:delete` | 删除 |
| Roles | `/api/roles/:id/permissions` | POST | `role:assign` | 分配权限 |
| System | `/api/system/configs` | POST/GET | `system:config` | 配置 CRUD |
| System | `/api/system/configs/:key` | GET/PUT/DELETE | `system:config` | 配置单项操作 |
| System | `/api/system/logs` | GET | `system:logs` | 操作日志查询 |

## PrismaService 封装

保持项目现有导入路径和适配器模式，基于 `prisma-admin-database/admin-database-client-types/client.js` 封装标准 NestJS Service。Schema 使用 `provider = "prisma-client"`（新 Prisma Client），需要配合 `@prisma/adapter-pg` 驱动适配器使用。

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'prisma-admin-database/admin-database-client-types/client.js';

@Injectable()
export class PrismaAdminService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = `${process.env.ADMIN_DATABASE_URL}`;
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

替换现有 `src/lib/prisma/admin.ts` 的简单实例化方式。

## Seed 脚本

位于 `prisma/admin/seed.ts`，执行以下操作：

1. 创建 15 个权限点（article/user/role/system 四个模块）
2. 创建「超级管理员」角色并分配所有权限
3. 创建默认管理员 `admin` / `admin123`

通过 `pnpm prisma:seed` 运行。

## 与原有计划的差异摘要

| 项目 | 原始计划 | 调整后 |
|------|---------|--------|
| 数据源 | RDS + Supabase 双数据源 | 单一 admin 数据库 |
| Prisma Shared | 有（共享 Schema） | **删除** |
| Articles 模块 | 有（操作共享 Schema 文章） | **删除** |
| PrismaService 路径 | `generated/prisma/admin` | `admin-database-client-types/client.js` |
| Database URL 变量 | `RDS_DATABASE_URL` + `SUPABASE_DATABASE_URL` | `ADMIN_DATABASE_URL` |
| 模块数量 | 6 个模块 | 4 个模块（Auth, Users, Roles, System） |

## 删除项

- `src/lib/prisma/admin.ts` — 旧入口，迁移到 `src/prisma/admin/prisma-admin.service.ts`
- `src/dto/login.dto.ts` — 旧 DTO，已移至 `src/modules/auth/dto/login.dto.ts`
- `src/prisma/shared/prisma-shared.service.ts` — 共享数据源，不再需要
- `src/modules/articles/` — 整个文章管理模块，不再需要

## 保留项

- `src/lib/script.ts` — demo 脚本，暂保留
- `src/utils/fake/` — 暂保留，后续清理
- `prisma-game-database/` — 子模块，保留不动
