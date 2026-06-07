# 数据库架构设计文档

> 日期：2026-06-07
> 项目：xx-game-admin-service（NestJS 管理后台）

## 1. 整体架构

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│              (Ant Design Pro / React Admin)                       │
│         ┌───────────┐              ┌───────────┐                 │
│         │ 登录/权限  │              │  管理界面  │                 │
│         └─────┬─────┘              └─────┬─────┘                 │
└───────────────┼──────────────────────────┼───────────────────────┘
                │      HTTP + JWT          │
┌───────────────┼──────────────────────────┼───────────────────────┐
│  NestJS (阿里云 ECS)                    │                        │
│  ┌──────────────────────────────────────┴───────────────┐       │
│  │                 AppModule                             │       │
│  │  ┌──────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐│       │
│  │  │ Auth     │  │  Users  │  │  Roles  │  │ Articles││       │
│  │  │ Module   │  │  Module │  │  Module │  │  Module ││       │
│  │  └────┬─────┘  └────┬────┘  └────┬────┘  └────┬────┘│       │
│  └───────┼─────────────┼────────────┼─────────────┼─────┘       │
│          │             │            │             │               │
│  ┌───────┴─────────────┴────────────┴─────────────┴─────┐       │
│  │                 Prisma Service Layer                  │       │
│  │  ┌──────────────────────┐ ┌───────────────────────┐  │       │
│  │  │  AdminPrismaService  │ │  SharedPrismaService  │  │       │
│  │  │  (阿里云 RDS PG)     │ │  (Supabase PG 接入)    │  │       │
│  │  │  用户 / 角色 / 权限   │ │  文章 / 业务数据      │  │       │
│  │  │  系统配置 / 操作日志  │ │                       │  │       │
│  │  └──────────┬───────────┘ └───────────┬───────────┘  │       │
│  └─────────────┼─────────────────────────┼──────────────┘       │
└────────────────┼─────────────────────────┼──────────────────────┘
                 │                         │
      ┌──────────┴──────────┐    ┌─────────┴──────────┐
      │  阿里云 RDS PG      │    │  Supabase PG (免费) │
      │  · admin_users      │    │  · articles         │
      │  · roles            │    │  · article_categories│
      │  · role_permissions │    │  · tags             │
      │  · permissions      │    │  · ...共享业务表... │
      │  · system_configs   │    └─────────────────────┘
      │  · operation_logs   │
      └─────────────────────┘
```

## 2. 数据库选型与部署

| 用途 | 数据库 | 部署方式 | 连接方式 |
|------|--------|---------|---------|
| 共享 Schema（业务数据） | PostgreSQL | Supabase 免费 tier | Prisma 直连 PG 连接串 |
| 自有 Schema（权限系统） | PostgreSQL | 阿里云 RDS PG | Prisma 直连 RDS 连接串 |

## 3. Schema 共享方案

两个项目（Next.js 前端 + NestJS 管理后台）通过 **私有 npm 包 `@xx-game/shared-prisma`** 共享 Prisma Schema：

```
shared-prisma/
├── prisma/
│   ├── schema.prisma      # 共享 Schema 定义
│   └── migrations/        # 迁移文件
├── src/
│   └── index.ts           # 重新导出 PrismaClient
└── package.json
```

- Schema 变更 → 在 `shared-prisma` 仓库修改 → 发布新版本 → 两个项目各自升级依赖
- NestJS 项目中引入 `@xx-game/shared-prisma`，通过 `SharedPrismaService` 封装使用

## 4. 自有 Schema 表设计

### 4.1 AdminUser（管理员用户）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | PK, autoIncrement | 自增主键 |
| username | String | UNIQUE, NOT NULL | 登录用户名 |
| password | String | NOT NULL | bcrypt 加密存储 |
| email | String? | | 邮箱 |
| avatar | String? | | 头像 URL |
| status | Boolean | default true | 启用/禁用 |
| roleId | Int? | FK → Role.id | 关联角色 |
| lastLoginAt | DateTime? | | 最后登录时间 |
| createdAt | DateTime | default now() | |
| updatedAt | DateTime | @updatedAt | |

### 4.2 Role（角色）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | PK, autoIncrement | |
| name | String | UNIQUE, NOT NULL | 角色名（如"超级管理员"、"编辑"） |
| description | String? | | 角色描述 |
| isSystem | Boolean | default false | 系统保护角色（不可删除） |
| createdAt | DateTime | default now() | |
| updatedAt | DateTime | @updatedAt | |

### 4.3 Permission（权限点）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | PK, autoIncrement | |
| code | String | UNIQUE, NOT NULL | 权限编码，如 `article:create` |
| name | String | NOT NULL | 权限名，如"创建文章" |
| description | String? | | 权限说明 |
| module | String | NOT NULL | 所属模块，如 "article"、"user"、"role"、"system" |
| action | String | NOT NULL | 操作，如 "create"、"read"、"update"、"delete" |
| createdAt | DateTime | default now() | |

**code 命名约定：** `{module}:{action}`，如 `article:create`、`user:delete`、`role:assign`、`system:config`。

### 4.4 RolePermission（角色-权限关联表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| roleId | Int | PK, FK → Role.id | |
| permissionId | Int | PK, FK → Permission.id | |

多对多中间表，没有额外字段。

### 4.5 SystemConfig（系统配置）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | PK, autoIncrement | |
| key | String | UNIQUE, NOT NULL | 配置键名 |
| value | JSONB | NOT NULL | 配置值（JSONB 支持任意结构） |
| description | String? | | 配置说明 |
| isEncrypted | Boolean | default false | 是否加密存储（敏感配置如密钥） |
| createdAt | DateTime | default now() | |
| updatedAt | DateTime | @updatedAt | |

### 4.6 OperationLog（操作日志）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | PK, autoIncrement | |
| adminUserId | Int | | 操作人 ID |
| action | String | NOT NULL | 操作类型: LOGIN, LOGOUT, CREATE_USER, UPDATE_USER, DELETE_USER, CREATE_ROLE, UPDATE_ROLE, DELETE_ROLE, ASSIGN_PERMISSION, DELETE_ARTICLE, UPDATE_SYSTEM_CONFIG |
| targetType | String? | | 操作目标类型: AdminUser, Role, Article, SystemConfig |
| targetId | Int? | | 操作目标 ID |
| detail | JSONB? | | 变更详情（变更前后快照） |
| ip | String? | | 请求 IP |
| userAgent | String? | | 浏览器/客户端标识 |
| createdAt | DateTime | default now() | |

**记录范围：** 仅记录关键操作（登录登出、用户增删改、角色增删改、权限变更、文章删除、系统配置修改），日常读取操作不记录。

### 4.7 E-R 关系图

```
AdminUser N ──── 1 Role
Role      N ──── N Permission  (通过 RolePermission 中间表)
AdminUser 1 ──── N OperationLog
```

## 5. 认证与权限体系

### 5.1 JWT 认证

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 签名算法 | HS256 | 对称加密 |
| Secret | 环境变量 JWT_SECRET | |
| Access Token 有效期 | 24h | 管理后台无需频繁刷新 |
| Token 存储 | localStorage | 前端管理 |

### 5.2 登录流程

```
1. POST /api/auth/login → 校验 username + password (bcrypt.compare)
2. 查询用户及关联角色、权限 → 生成 JWT payload: { sub, roleId, permissions[] }
3. 返回 token + currentUser
4. 记录 OperationLog (action: "LOGIN")
```

### 5.3 权限校验流程

```
1. AuthGuard: 从 Authorization header 提取 JWT → 解析 → 挂载到 request.user
2. PermissionGuard (@RequirePermission('article:create')):
   → 检查 request.user.permissions 是否包含目标权限
   → 不包含 → 403 Forbidden
```

### 5.4 权限初始化（Seed）

Permission 表通过代码 seed 初始化，不在管理界面中动态增删：

```typescript
// prisma/admin/seed.ts
const permissions = [
  { code: 'article:create', name: '创建文章', module: 'article', action: 'create' },
  { code: 'article:read',   name: '查看文章', module: 'article', action: 'read' },
  { code: 'article:update', name: '编辑文章', module: 'article', action: 'update' },
  { code: 'article:delete', name: '删除文章', module: 'article', action: 'delete' },
  { code: 'user:create',    name: '创建用户', module: 'user', action: 'create' },
  { code: 'user:read',      name: '查看用户', module: 'user', action: 'read' },
  { code: 'user:update',    name: '编辑用户', module: 'user', action: 'update' },
  { code: 'user:delete',    name: '删除用户', module: 'user', action: 'delete' },
  { code: 'role:create',    name: '创建角色', module: 'role', action: 'create' },
  { code: 'role:read',      name: '查看角色', module: 'role', action: 'read' },
  { code: 'role:update',    name: '编辑角色', module: 'role', action: 'update' },
  { code: 'role:delete',    name: '删除角色', module: 'role', action: 'delete' },
  { code: 'role:assign',    name: '分配权限', module: 'role', action: 'assign' },
  { code: 'system:config',  name: '系统配置', module: 'system', action: 'config' },
  { code: 'system:logs',    name: '查看日志', module: 'system', action: 'logs' },
];
```

并创建一个默认超级管理员角色（`name: "超级管理员"`），关联所有权限。

## 6. 模块结构

```bash
src/
├── main.ts                       # 启动入口
├── app.module.ts                 # 根模块
├── common/                       # 全局共享
│   ├── guards/
│   │   ├── auth.guard.ts         # JWT 验证
│   │   └── permission.guard.ts   # 权限校验
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── require-permission.decorator.ts
│   │   └── public.decorator.ts   # 标记公开接口
│   ├── filters/
│   │   └── http-exception.filter.ts   # 统一错误响应
│   ├── interceptors/
│   │   └── transform.interceptor.ts   # 统一成功响应
│   └── dto/
│       └── pagination.dto.ts     # 分页通用 DTO
├── modules/
│   ├── auth/                     # 认证 (A)
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── dto/ (login.dto.ts, login-response.dto.ts)
│   ├── users/                    # 用户管理 (B)
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/ (create, update, query)
│   ├── roles/                    # 角色权限 (C)
│   │   ├── roles.module.ts
│   │   ├── roles.controller.ts
│   │   ├── roles.service.ts
│   │   └── dto/
│   ├── permissions/              # 权限查询（只读）
│   │   └── permissions.service.ts
│   ├── articles/                 # 文章管理 (D - 共享 Schema)
│   │   ├── articles.module.ts
│   │   ├── articles.controller.ts
│   │   └── articles.service.ts
│   └── system/                   # 系统配置 / 日志 (E)
│       ├── system.module.ts
│       ├── system.controller.ts
│       └── system.service.ts
├── prisma/
│   ├── admin/
│   │   ├── prisma-admin.service.ts    # 封装自有 PrismaClient
│   │   └── schema.prisma
│   └── shared/
│       └── prisma-shared.service.ts   # 封装共享 PrismaClient
└── utils/
    └── fake/                     # 旧 mock 数据（后续移除）
```

## 7. 统一响应格式

```typescript
// 成功响应
{
  success: true,
  data: { ... },
  message?: string,
}

// 分页响应
{
  success: true,
  data: {
    list: [...],
    total: 100,
    page: 1,
    pageSize: 20,
  },
}

// 错误响应
{
  success: false,
  message: "权限不足",
  error: "FORBIDDEN",
  statusCode: 403,
}
```

## 8. 错误处理策略

| 错误类型 | HTTP 状态码 | 处理方式 |
|---------|------------|---------|
| 未认证 | 401 | AuthGuard 抛出 UnauthorizedException |
| 无权限 | 403 | PermissionGuard 抛出 ForbiddenException |
| 资源不存在 | 404 | Service 中查询不到时抛出 NotFoundException |
| 参数校验失败 | 400 | class-validator / ValidationPipe 自动处理 |
| 唯一约束冲突 | 409 | Service 捕获 Prisma P2002 错误后抛出 ConflictException |
| 内部错误 | 500 | 全局 ExceptionFilter 捕获，不泄漏内部详情 |
| 数据库连接失败 | 503 | NestJS 健康检查 + 重试策略 |

## 9. 技术栈依赖新增

```bash
# 核心依赖
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add @prisma/client bcrypt class-validator class-transformer

# 开发依赖
pnpm add -D prisma @types/bcrypt @types/passport-jwt

# 共享 Prisma 包
pnpm add @xx-game/shared-prisma
```
