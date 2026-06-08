# 管理后台数据库重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将全部后台数据统一存放到 `prisma-admin-database`，实现管理员认证、RBAC 权限管理、系统配置及操作日志模块。

**Architecture:** NestJS 11 + Prisma 7 + 单一 PostgreSQL 数据库。基于现有 `prisma-admin-database` 的 `admin-database-client-types` 导入路径，封装标准 PrismaAdminService。JWT+Passport 认证，自定义装饰器实现声明式权限控制。

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL, JWT, bcrypt, class-validator, class-transformer, @prisma/adapter-pg

**Dependency order:** 依赖安装 → Schema → PrismaService → 通用基础设施 → 认证 → 管理员 CRUD → 角色权限 → 系统模块 → Seed → 组装

---

### 文件清单总览

| 文件 | 操作 | 职责 |
|------|------|------|
| `package.json` | 修改 | 添加依赖 + seed 命令 |
| `prisma-admin-database/schema.prisma` | 重写 | 替换 demo User/Post 为 admin 6 表 |
| `src/prisma/admin/prisma-admin.service.ts` | 创建 | 封装 PrismaClient + PrismaPg 适配器 |
| `src/lib/prisma/admin.ts` | 删除 | 旧入口，迁移到正式 Service |
| `src/common/interfaces/response.interface.ts` | 创建 | 统一响应类型 |
| `src/common/interceptors/transform.interceptor.ts` | 创建 | 统一成功响应包装 |
| `src/common/filters/http-exception.filter.ts` | 创建 | 统一错误响应 |
| `src/common/dto/pagination.dto.ts` | 创建 | 分页通用 DTO |
| `src/common/guards/auth.guard.ts` | 创建 | JWT 认证守卫 |
| `src/common/guards/permission.guard.ts` | 创建 | 权限校验守卫 |
| `src/common/decorators/current-user.decorator.ts` | 创建 | 获取当前用户 |
| `src/common/decorators/require-permission.decorator.ts` | 创建 | 声明所需权限 |
| `src/common/decorators/public.decorator.ts` | 创建 | 标记公开接口 |
| `src/modules/auth/auth.module.ts` | 创建 | 认证模块 |
| `src/modules/auth/auth.controller.ts` | 创建 | 登录/当前用户 API |
| `src/modules/auth/auth.service.ts` | 创建 | 认证业务逻辑 |
| `src/modules/auth/dto/login.dto.ts` | 创建 | 登录请求 DTO |
| `src/modules/auth/dto/login-response.dto.ts` | 创建 | 登录响应 DTO |
| `src/modules/auth/jwt.strategy.ts` | 创建 | JWT Passport 策略 |
| `src/modules/users/users.module.ts` | 创建 | 管理员 CRUD 模块 |
| `src/modules/users/users.controller.ts` | 创建 | 管理员 CRUD API |
| `src/modules/users/users.service.ts` | 创建 | 管理员业务逻辑 |
| `src/modules/users/dto/create-user.dto.ts` | 创建 | 创建管理员 DTO |
| `src/modules/users/dto/update-user.dto.ts` | 创建 | 更新管理员 DTO |
| `src/modules/users/dto/query-user.dto.ts` | 创建 | 管理员查询 DTO |
| `src/modules/roles/roles.module.ts` | 创建 | 角色管理模块 |
| `src/modules/roles/roles.controller.ts` | 创建 | 角色 CRUD + 权限分配 API |
| `src/modules/roles/roles.service.ts` | 创建 | 角色业务逻辑 |
| `src/modules/roles/dto/create-role.dto.ts` | 创建 | 创建角色 DTO |
| `src/modules/roles/dto/assign-permission.dto.ts` | 创建 | 分配权限 DTO |
| `src/modules/permissions/permissions.service.ts` | 创建 | 权限查询服务 |
| `src/modules/system/system.module.ts` | 创建 | 系统管理模块 |
| `src/modules/system/system.controller.ts` | 创建 | 配置/日志 API |
| `src/modules/system/system.service.ts` | 创建 | 系统业务逻辑 |
| `src/modules/system/dto/create-system-config.dto.ts` | 创建 | 创建配置 DTO |
| `src/modules/system/dto/update-system-config.dto.ts` | 创建 | 更新配置 DTO |
| `src/modules/system/dto/query-log.dto.ts` | 创建 | 日志查询 DTO |
| `prisma/admin/seed.ts` | 创建 | 权限 Seed + 默认管理员 |
| `src/main.ts` | 修改 | 添加 ValidationPipe、CORS、全局过滤器/拦截器 |
| `src/app.module.ts` | 重写 | 注册所有模块 + 全局 Guards |
| `src/dto/login.dto.ts` | 删除 | 已移至 auth 模块 |

---

### Task 1: 安装依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装核心依赖**

```bash
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
pnpm add -D @types/bcrypt @types/passport-jwt
```

Expected: 依赖添加到 package.json 的 dependencies / devDependencies。

- [ ] **Step 2: 验证安装**

```bash
pnpm ls @nestjs/jwt passport bcrypt class-validator
```

Expected: 显示已安装的版本号，无报错。

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add auth and validation dependencies"
```

---

### Task 2: 重写 Schema 并生成 Prisma Client

**Files:**
- Rewrite: `prisma-admin-database/schema.prisma`

- [ ] **Step 1: 重写 `prisma-admin-database/schema.prisma`**

将当前 demo 的 User/Post 模型替换为完整的 admin 6 表：

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client"
  output   = "admin-database-client-types"
}

datasource db {
  provider = "postgresql"
  url      = env("ADMIN_DATABASE_URL")
}

// ─── 管理员用户 ───
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

// ─── 角色 ───
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

// ─── 权限点 ───
model Permission {
  id          Int       @id @default(autoincrement())
  code        String    @unique @db.VarChar(100)
  name        String    @db.VarChar(100)
  description String?   @db.Text
  module      String    @db.VarChar(50)
  action      String    @db.VarChar(50)
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz()

  roles RolePermission[]

  @@map("permissions")
}

// ─── 角色-权限关联 ───
model RolePermission {
  roleId       Int
  permissionId Int

  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}

// ─── 系统配置 ───
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

// ─── 操作日志 ───
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

- [ ] **Step 2: 生成 Prisma Client 并创建迁移**

```bash
# 删除旧 client types
rm -rf prisma-admin-database/admin-database-client-types

# 生成新的 Prisma Client
pnpm dlx prisma generate --config ./prisma-admin-database/prisma.config.ts

# 创建初始迁移（需要 ADMIN_DATABASE_URL 可访问）
pnpm dlx prisma migrate dev --name admin_init --config ./prisma-admin-database/prisma.config.ts
```

Expected: `prisma-admin-database/admin-database-client-types/` 目录生成新的客户端代码。

> 如果数据库尚未就绪，可先 `pnpm dlx prisma generate --config ./prisma-admin-database/prisma.config.ts` 生成 Client，迁移延后执行。

- [ ] **Step 3: Commit**

```bash
git add prisma-admin-database/schema.prisma prisma-admin-database/admin-database-client-types prisma-admin-database/migrations
git commit -m "feat: add admin Prisma schema with 6 tables"
```

---

### Task 3: 封装 PrismaAdminService

**Files:**
- Create: `src/prisma/admin/prisma-admin.service.ts`
- Delete: `src/lib/prisma/admin.ts`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p src/prisma/admin
```

- [ ] **Step 2: 创建 `src/prisma/admin/prisma-admin.service.ts`**

注意：Schema 使用 `provider = "prisma-client"`（新 Prisma Client），需要配合 `@prisma/adapter-pg` 驱动适配器。

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

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 3: 创建单元测试 `src/prisma/admin/prisma-admin.service.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaAdminService } from './prisma-admin.service';

describe('PrismaAdminService', () => {
  let service: PrismaAdminService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaAdminService],
    }).compile();

    service = module.get<PrismaAdminService>(PrismaAdminService);
  });

  afterAll(async () => {
    await service.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

- [ ] **Step 4: 运行测试**

```bash
pnpm test src/prisma/admin/prisma-admin.service.spec.ts
```

Expected: 测试通过（1 passed）。

- [ ] **Step 5: 删除旧入口文件**

```bash
rm src/lib/prisma/admin.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/prisma/admin/
git rm src/lib/prisma/admin.ts
git commit -m "feat: add PrismaAdminService with adapter-pg, remove old admin.ts"
```

---

### Task 4: 通用基础设施

**Files:**
- Create: `src/common/interfaces/response.interface.ts`
- Create: `src/common/interceptors/transform.interceptor.ts`
- Create: `src/common/filters/http-exception.filter.ts`
- Create: `src/common/dto/pagination.dto.ts`
- Create: `src/common/guards/auth.guard.ts`
- Create: `src/common/guards/permission.guard.ts`
- Create: `src/common/decorators/current-user.decorator.ts`
- Create: `src/common/decorators/require-permission.decorator.ts`
- Create: `src/common/decorators/public.decorator.ts`

- [ ] **Step 1: 创建响应类型接口**

```bash
mkdir -p src/common/interfaces src/common/interceptors src/common/filters src/common/dto src/common/guards src/common/decorators
```

- [ ] **Step 2: 创建 `src/common/interfaces/response.interface.ts`**

```typescript
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  statusCode: number;
}
```

- [ ] **Step 3: 创建 `src/common/interceptors/transform.interceptor.ts`**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SuccessResponse } from '../interfaces/response.interface';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data: data ?? null,
      })),
    );
  }
}
```

- [ ] **Step 4: 创建 `src/common/filters/http-exception.filter.ts`**

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponse } from '../interfaces/response.interface';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>).message as string ||
          exception.message;

    const errorResponse: ErrorResponse = {
      success: false,
      message: Array.isArray(message) ? message[0] : message,
      error: HttpStatus[status] || 'ERROR',
      statusCode: status,
    };

    response.status(status).json(errorResponse);
  }
}
```

- [ ] **Step 5: 创建 `src/common/dto/pagination.dto.ts`**

```typescript
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
```

- [ ] **Step 6: 创建 `src/common/decorators/public.decorator.ts`**

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 7: 创建 `src/common/decorators/require-permission.decorator.ts`**

```typescript
import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permissions);
```

- [ ] **Step 8: 创建 `src/common/decorators/current-user.decorator.ts`**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

- [ ] **Step 9: 创建 `src/common/guards/auth.guard.ts`**

```typescript
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('登录已过期，请重新登录');
    }
    return user;
  }
}
```

- [ ] **Step 10: 创建 `src/common/guards/permission.guard.ts`**

```typescript
import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('请先登录');
    }

    const hasPermission = requiredPermissions.some((perm) =>
      user.permissions?.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException('权限不足');
    }

    return true;
  }
}
```

- [ ] **Step 11: 创建拦截器单元测试 `src/common/interceptors/transform.interceptor.spec.ts`**

```typescript
import { TransformInterceptor } from './transform.interceptor';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap response with success:true', (done) => {
    const mockContext = {} as ExecutionContext;
    const mockCallHandler: CallHandler = {
      handle: () => of({ id: 1, name: 'test' }),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((res) => {
      expect(res).toEqual({
        success: true,
        data: { id: 1, name: 'test' },
      });
      done();
    });
  });

  it('should wrap null response', (done) => {
    const mockContext = {} as ExecutionContext;
    const mockCallHandler: CallHandler = {
      handle: () => of(null),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((res) => {
      expect(res).toEqual({
        success: true,
        data: null,
      });
      done();
    });
  });
});
```

- [ ] **Step 12: 创建过滤器单元测试 `src/common/filters/http-exception.filter.spec.ts`**

```typescript
import { HttpExceptionFilter } from './http-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    } as any;
  });

  it('should format 403 Forbidden response correctly', () => {
    const exception = new HttpException('权限不足', HttpStatus.FORBIDDEN);
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: '权限不足',
      error: 'Forbidden',
      statusCode: 403,
    });
  });

  it('should format 401 Unauthorized response correctly', () => {
    const exception = new HttpException('未登录', HttpStatus.UNAUTHORIZED);
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: '未登录',
      error: 'Unauthorized',
      statusCode: 401,
    });
  });
});
```

- [ ] **Step 13: 创建 auth guard 单元测试 `src/common/guards/auth.guard.spec.ts`**

```typescript
import { AuthGuard } from './auth.guard';
import { Reflector } from '@nestjs/core';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new AuthGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});
```

- [ ] **Step 14: 运行测试**

```bash
pnpm test src/common/interceptors/transform.interceptor.spec.ts
pnpm test src/common/filters/http-exception.filter.spec.ts
pnpm test src/common/guards/auth.guard.spec.ts
```

Expected: 全部测试通过。

- [ ] **Step 15: Commit**

```bash
git add src/common/
git commit -m "feat: add common infrastructure (response, guards, decorators, interceptors, filters)"
```

---

### Task 5: Auth 模块

**Files:**
- Create: `src/modules/auth/auth.module.ts`
- Create: `src/modules/auth/auth.controller.ts`
- Create: `src/modules/auth/auth.service.ts`
- Create: `src/modules/auth/dto/login.dto.ts`
- Create: `src/modules/auth/dto/login-response.dto.ts`
- Create: `src/modules/auth/jwt.strategy.ts`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p src/modules/auth/dto
```

- [ ] **Step 2: 创建 `src/modules/auth/dto/login.dto.ts`**

```typescript
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsBoolean()
  autoLogin?: boolean;
}
```

- [ ] **Step 3: 创建 `src/modules/auth/dto/login-response.dto.ts`**

```typescript
export class LoginResponseDto {
  token: string;
  currentUser: {
    id: number;
    username: string;
    email?: string | null;
    avatar?: string | null;
    roleId?: number | null;
    roleName?: string | null;
    permissions: string[];
  };
}
```

- [ ] **Step 4: 创建 `src/modules/auth/jwt.strategy.ts`**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaAdminService } from '../../prisma/admin/prisma-admin.service';

interface JwtPayload {
  sub: number;
  roleId: number | null;
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prismaAdmin: PrismaAdminService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prismaAdmin.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, status: true, roleId: true },
    });

    if (!user || !user.status) {
      throw new UnauthorizedException('用户已被禁用或不存在');
    }

    return {
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      permissions: payload.permissions,
    };
  }
}
```

- [ ] **Step 5: 创建 `src/modules/auth/auth.service.ts`**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaAdminService } from '../../prisma/admin/prisma-admin.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private prismaAdmin: PrismaAdminService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto, ip?: string, userAgent?: string): Promise<LoginResponseDto> {
    const user = await this.prismaAdmin.adminUser.findUnique({
      where: { username: loginDto.username },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (!user.status) {
      throw new UnauthorizedException('账号已被禁用');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const permissions = user.role?.permissions.map((rp) => rp.permission.code) || [];

    const payload = {
      sub: user.id,
      roleId: user.roleId,
      permissions,
    };

    const token = this.jwtService.sign(payload);

    // 更新最后登录时间
    await this.prismaAdmin.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 记录操作日志
    await this.prismaAdmin.operationLog.create({
      data: {
        adminUserId: user.id,
        action: 'LOGIN',
        ip,
        userAgent,
      },
    });

    return {
      token,
      currentUser: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        roleId: user.roleId,
        roleName: user.role?.name || null,
        permissions,
      },
    };
  }

  async getCurrentUser(userId: number) {
    const user = await this.prismaAdmin.adminUser.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const permissions = user.role?.permissions.map((rp) => rp.permission.code) || [];

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      roleId: user.roleId,
      roleName: user.role?.name || null,
      permissions,
    };
  }
}
```

- [ ] **Step 6: 创建 `src/modules/auth/auth.controller.ts`**

```typescript
import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Request } from 'express';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || undefined;
    return this.authService.login(loginDto, ip, userAgent);
  }

  @UseGuards(AuthGuard)
  @Get('currentUser')
  async getCurrentUser(@CurrentUser('id') userId: number) {
    return this.authService.getCurrentUser(userId);
  }
}
```

- [ ] **Step 7: 创建 `src/modules/auth/auth.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PrismaAdminService } from '../../prisma/admin/prisma-admin.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PrismaAdminService],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 8: 创建 auth service 单元测试 `src/modules/auth/auth.service.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaAdminService } from '../../prisma/admin/prisma-admin.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaAdmin: Partial<PrismaAdminService>;

  const mockAdminUser = {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    email: 'admin@xxgame.com',
    avatar: null,
    status: true,
    roleId: 1,
    lastLoginAt: null,
    role: {
      id: 1,
      name: '超级管理员',
      permissions: [
        { permission: { code: 'article:create' } },
        { permission: { code: 'article:read' } },
      ],
    },
  };

  beforeEach(async () => {
    prismaAdmin = {
      adminUser: {
        findUnique: jest.fn().mockResolvedValue(mockAdminUser),
        update: jest.fn().mockResolvedValue(mockAdminUser),
      } as any,
      operationLog: {
        create: jest.fn().mockResolvedValue({}),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaAdminService,
          useValue: prismaAdmin,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should login successfully with correct credentials', async () => {
    const result = await authService.login({
      username: 'admin',
      password: 'admin123',
    });

    expect(result.token).toBe('mock-token');
    expect(result.currentUser.username).toBe('admin');
    expect(result.currentUser.permissions).toContain('article:create');
  });

  it('should throw UnauthorizedException with wrong password', async () => {
    await expect(
      authService.login({ username: 'admin', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 9: 运行测试**

```bash
pnpm test src/modules/auth/auth.service.spec.ts
```

Expected: 测试通过。

- [ ] **Step 10: Commit**

```bash
git add src/modules/auth/
git commit -m "feat: add auth module with login and currentUser endpoints"
```

---

### Task 6: Users 模块（管理员 CRUD）

**Files:**
- Create: `src/modules/users/users.module.ts`
- Create: `src/modules/users/users.controller.ts`
- Create: `src/modules/users/users.service.ts`
- Create: `src/modules/users/dto/create-user.dto.ts`
- Create: `src/modules/users/dto/update-user.dto.ts`
- Create: `src/modules/users/dto/query-user.dto.ts`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p src/modules/users/dto
```

- [ ] **Step 2: 创建 `src/modules/users/dto/create-user.dto.ts`**

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsInt, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsInt()
  roleId?: number;
}
```

- [ ] **Step 3: 创建 `src/modules/users/dto/update-user.dto.ts`**

```typescript
import { IsOptional, IsString, IsEmail, IsInt, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @IsOptional()
  @IsInt()
  roleId?: number;
}
```

- [ ] **Step 4: 创建 `src/modules/users/dto/query-user.dto.ts`**

```typescript
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryUserDto extends PaginationDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
```

- [ ] **Step 5: 创建 `src/modules/users/users.service.ts`**

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaAdminService } from '../../prisma/admin/prisma-admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

@Injectable()
export class UsersService {
  constructor(private prismaAdmin: PrismaAdminService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prismaAdmin.adminUser.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prismaAdmin.adminUser.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        email: dto.email,
        avatar: dto.avatar,
        roleId: dto.roleId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        status: true,
        roleId: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async findAll(query: QueryUserDto) {
    const { page = 1, pageSize = 20, username, status } = query;
    const where: any = {};
    if (username) where.username = { contains: username };
    if (status !== undefined) where.status = status;

    const [list, total] = await Promise.all([
      this.prismaAdmin.adminUser.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { role: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaAdmin.adminUser.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async findOne(id: number) {
    const user = await this.prismaAdmin.adminUser.findUnique({
      where: { id },
      include: { role: { select: { id: true, name: true } } },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prismaAdmin.adminUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const data: any = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prismaAdmin.adminUser.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        status: true,
        roleId: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async remove(id: number) {
    const user = await this.prismaAdmin.adminUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return this.prismaAdmin.adminUser.delete({ where: { id } });
  }
}
```

- [ ] **Step 6: 创建 `src/modules/users/users.controller.ts`**

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/users')
@UseGuards(AuthGuard, PermissionGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @RequirePermission('user:create')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @RequirePermission('user:read')
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('user:read')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Put(':id')
  @RequirePermission('user:update')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(+id, dto);
  }

  @Delete(':id')
  @RequirePermission('user:delete')
  remove(@Param('id') id: string, @CurrentUser('id') currentUserId: number) {
    if (+id === currentUserId) {
      throw new BadRequestException('不能删除自己的账号');
    }
    return this.usersService.remove(+id);
  }
}
```

- [ ] **Step 7: 创建 `src/modules/users/users.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaAdminService } from '../../prisma/admin/prisma-admin.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaAdminService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 8: 创建 users service 单元测试 `src/modules/users/users.service.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaAdminService } from '../../prisma/admin/prisma-admin.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    adminUser: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaAdminService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should throw ConflictException when creating duplicate username', async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValue({ id: 1, username: 'existing' });
    await expect(
      service.create({ username: 'existing', password: '123456' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException when updating non-existing user', async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValue(null);
    await expect(
      service.update(999, { email: 'test@test.com' }),
    ).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 9: 运行测试**

```bash
pnpm test src/modules/users/users.service.spec.ts
```

Expected: 测试通过。

- [ ] **Step 10: Commit**

```bash
git add src/modules/users/
git commit -m "feat: add users module with CRUD endpoints"
```

---

### Task 7: Roles 模块（角色 CRUD + 权限分配）

**Files:**
- Create: `src/modules/roles/roles.module.ts`
- Create: `src/modules/roles/roles.controller.ts`
- Create: `src/modules/roles/roles.service.ts`
- Create: `src/modules/roles/dto/create-role.dto.ts`
- Create: `src/modules/roles/dto/assign-permission.dto.ts`
- Create: `src/modules/permissions/permissions.service.ts`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p src/modules/roles/dto src/modules/permissions
```

- [ ] **Step 2: 创建 `src/modules/roles/dto/create-role.dto.ts`**

```typescript
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

- [ ] **Step 3: 创建 `src/modules/roles/dto/assign-permission.dto.ts`**

```typescript
import { IsArray, IsInt } from 'class-validator';

export class AssignPermissionDto {
  @IsArray()
  @IsInt({ each: true })
  permissionIds: number[];
}
```

- [ ] **Step 4: 创建 `src/modules/roles/roles.service.ts`**

```typescript
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaAdminService } from '../../prisma/admin/prisma-admin.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';

@Injectable()
export class RolesService {
  constructor(private prismaAdmin: PrismaAdminService) {}

  async create(dto: CreateRoleDto) {
    const existing = await this.prismaAdmin.role.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('角色名已存在');
    }
    return this.prismaAdmin.role.create({ data: dto });
  }

  async findAll() {
    return this.prismaAdmin.role.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const role = await this.prismaAdmin.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
    });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    return role;
  }

  async update(id: number, dto: Partial<CreateRoleDto>) {
    const role = await this.prismaAdmin.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    if (role.isSystem) {
      throw new BadRequestException('系统角色不可修改');
    }
    return this.prismaAdmin.role.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const role = await this.prismaAdmin.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    if (role.isSystem) {
      throw new BadRequestException('系统角色不可删除');
    }
    if (role._count.users > 0) {
      throw new BadRequestException('该角色下仍有用户，无法删除');
    }
    return this.prismaAdmin.role.delete({ where: { id } });
  }

  async assignPermissions(id: number, dto: AssignPermissionDto) {
    const role = await this.prismaAdmin.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    // 删除旧的关联
    await this.prismaAdmin.rolePermission.deleteMany({
      where: { roleId: id },
    });

    // 创建新的关联
    await this.prismaAdmin.rolePermission.createMany({
      data: dto.permissionIds.map((permissionId) => ({
        roleId: id,
        permissionId,
      })),
    });

    return this.findOne(id);
  }
}
```

- [ ] **Step 5: 创建 `src/modules/roles/roles.controller.ts`**

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('api/roles')
@UseGuards(AuthGuard, PermissionGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Post()
  @RequirePermission('role:create')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  @RequirePermission('role:read')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermission('role:read')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(+id);
  }

  @Put(':id')
  @RequirePermission('role:update')
  update(@Param('id') id: string, @Body() dto: Partial<CreateRoleDto>) {
    return this.rolesService.update(+id, dto);
  }

  @Delete(':id')
  @RequirePermission('role:delete')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(+id);
  }

  @Post(':id/permissions')
  @RequirePermission('role:assign')
  assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionDto) {
    return this.rolesService.assignPermissions(+id, dto);
  }
}
```

- [ ] **Step 6: 创建 `src/modules/roles/roles.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PrismaAdminService } from '../../prisma/admin/prisma-admin.service';

@Module({
  controllers: [RolesController],
  providers: [RolesService, PrismaAdminService],
  exports: [RolesService],
})
export class RolesModule {}
```

- [ ] **Step 7: 创建 `src/modules/permissions/permissions.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaAdminService } from '../../prisma/admin/prisma-admin.service';

@Injectable()
export class PermissionsService {
  constructor(private prismaAdmin: PrismaAdminService) {}

  async findAll() {
    return this.prismaAdmin.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  async findByModule(module: string) {
    return this.prismaAdmin.permission.findMany({
      where: { module },
      orderBy: { action: 'asc' },
    });
  }
}
```

- [ ] **Step 8: 创建 roles service 单元测试 `src/modules/roles/roles.service.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { PrismaAdminService } from '../../prisma/admin/prisma-admin.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('RolesService', () => {
  let service: RolesService;
  const mockPrisma = {
    role: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    rolePermission: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaAdminService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should throw ConflictException when creating duplicate role name', async () => {
    mockPrisma.role.findUnique.mockResolvedValue({ id: 1, name: 'admin' });
    await expect(
      service.create({ name: 'admin' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException when updating non-existing role', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    await expect(
      service.update(999, { name: 'test' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when deleting system role', async () => {
    mockPrisma.role.findUnique.mockResolvedValue({ id: 1, isSystem: true, _count: { users: 0 } });
    await expect(
      service.remove(1),
    ).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 9: 运行测试**

```bash
pnpm test src/modules/roles/roles.service.spec.ts
```

Expected: 角色服务测试通过。

- [ ] **Step 10: Commit**

```bash
git add src/modules/roles/ src/modules/permissions/
git commit -m "feat: add roles module with CRUD and permission assignment"
```

---

### Task 8: System 模块（配置 + 操作日志）

**Files:**
- Create: `src/modules/system/system.module.ts`
- Create: `src/modules/system/system.controller.ts`
- Create: `src/modules/system/system.service.ts`
- Create: `src/modules/system/dto/create-system-config.dto.ts`
- Create: `src/modules/system/dto/update-system-config.dto.ts`
- Create: `src/modules/system/dto/query-log.dto.ts`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p src/modules/system/dto
```

- [ ] **Step 2: 创建 `src/modules/system/dto/create-system-config.dto.ts`**

```typescript
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateSystemConfigDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsObject()
  value: Record<string, unknown>;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;
}
```

- [ ] **Step 3: 创建 `src/modules/system/dto/update-system-config.dto.ts`**

```typescript
import { IsOptional, IsObject, IsString, IsBoolean } from 'class-validator';

export class UpdateSystemConfigDto {
  @IsOptional()
  @IsObject()
  value?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;
}
```

- [ ] **Step 4: 创建 `src/modules/system/dto/query-log.dto.ts`**

```typescript
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryLogDto extends PaginationDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  adminUserId?: number;
}
```

- [ ] **Step 5: 创建 `src/modules/system/system.service.ts`**

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaAdminService } from '../../prisma/admin/prisma-admin.service';
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
    return this.prismaAdmin.systemConfig.create({ data: dto });
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
      data: dto,
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
```

- [ ] **Step 6: 创建 `src/modules/system/system.controller.ts`**

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { CreateSystemConfigDto } from './dto/create-system-config.dto';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { QueryLogDto } from './dto/query-log.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('api/system')
@UseGuards(AuthGuard, PermissionGuard)
export class SystemController {
  constructor(private systemService: SystemService) {}

  // ─── 系统配置 ───
  @Post('configs')
  @RequirePermission('system:config')
  createConfig(@Body() dto: CreateSystemConfigDto) {
    return this.systemService.createConfig(dto);
  }

  @Get('configs')
  @RequirePermission('system:config')
  findAllConfigs() {
    return this.systemService.findAllConfigs();
  }

  @Get('configs/:key')
  @RequirePermission('system:config')
  findConfigByKey(@Param('key') key: string) {
    return this.systemService.findConfigByKey(key);
  }

  @Put('configs/:key')
  @RequirePermission('system:config')
  updateConfig(@Param('key') key: string, @Body() dto: UpdateSystemConfigDto) {
    return this.systemService.updateConfig(key, dto);
  }

  @Delete('configs/:key')
  @RequirePermission('system:config')
  deleteConfig(@Param('key') key: string) {
    return this.systemService.deleteConfig(key);
  }

  // ─── 操作日志 ───
  @Get('logs')
  @RequirePermission('system:logs')
  findAllLogs(@Query() query: QueryLogDto) {
    return this.systemService.findAllLogs(query);
  }
}
```

- [ ] **Step 7: 创建 `src/modules/system/system.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { PrismaAdminService } from '../../prisma/admin/prisma-admin.service';

@Module({
  controllers: [SystemController],
  providers: [SystemService, PrismaAdminService],
})
export class SystemModule {}
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/system/
git commit -m "feat: add system module with config management and operation logs"
```

---

### Task 9: Seed 脚本

**Files:**
- Create: `prisma/admin/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p prisma/admin
```

- [ ] **Step 2: 创建 `prisma/admin/seed.ts`**

```typescript
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'prisma-admin-database/admin-database-client-types/client.js';
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
```

- [ ] **Step 3: 在 `package.json` 中添加 seed 命令**

找到 `package.json` 中的 `scripts` 字段，添加：

```json
"prisma:seed": "npx ts-node prisma/admin/seed.ts"
```

- [ ] **Step 4: 运行 seed 验证**

```bash
pnpm prisma:seed
```

Expected: 控制台输出 seed 日志，数据库中有默认管理员用户（admin / admin123）。

- [ ] **Step 5: Commit**

```bash
git add prisma/admin/seed.ts package.json
git commit -m "feat: add Prisma seed script for permissions, roles, and default admin user"
```

---

### Task 10: 组装 AppModule 与清理

**Files:**
- Modify: `src/main.ts`
- Rewrite: `src/app.module.ts`
- Delete: `src/dto/login.dto.ts`

- [ ] **Step 1: 更新 `src/main.ts`**

添加 ValidationPipe、CORS、全局过滤器/拦截器：

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 全局 ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 全局拦截器 & 过滤器
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 2: 重写 `src/app.module.ts`**

注册所有模块 + 全局 Guards：

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { SystemModule } from './modules/system/system.module';
import { AuthGuard } from './common/guards/auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    RolesModule,
    SystemModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
```

- [ ] **Step 3: 删除旧文件**

```bash
rm src/dto/login.dto.ts
```

- [ ] **Step 4: 构建验证**

```bash
pnpm build
```

Expected: 构建成功，`dist/` 目录生成，无 TypeScript 错误。

- [ ] **Step 5: 运行全部测试**

```bash
pnpm test
```

Expected: 所有单元测试通过。

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/app.module.ts
git rm src/dto/login.dto.ts
git commit -m "feat: wire up all modules, add global guards and validation"
```

---

## 自审检查

✅ **Spec coverage:** 所有 spec 中的需求都有对应任务覆盖——6 表 Schema（Task 2）、PrismaAdminService 封装（Task 3）、通用基础设施（Task 4）、认证流程（Task 5）、管理员 CRUD（Task 6）、RBAC 角色权限（Task 7）、系统配置与日志（Task 8）、Seed（Task 9）、模块组装与清理（Task 10）。

✅ **无占位符:** 所有步骤包含完整代码，无 "TBD"/"TODO"。

✅ **类型一致性:** 所有 model 字段、DTO 属性、service 签名在跨任务间保持一致。PrismaAdminService 使用 `prisma-admin-database/admin-database-client-types/client.js` 导入路径，与现有项目习惯一致。
