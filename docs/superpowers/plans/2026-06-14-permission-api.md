# Permission API 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建 PermissionsModule，提供权限列表 API（平铺 + 按 module 分组），使前端能获取权限数据并用于权限分配 UI 和动态菜单。

**Architecture:** 在已有 `PermissionsService` 基础上新增 Module/Controller/DTO，注册到 AppModule。Controller 提供两个只读 GET 接口，Service 新增 `findGrouped()` 方法，通过静态映射表将 `module` 字段转为中文 `moduleName`。

**Tech Stack:** NestJS 11, @nestjs/swagger (自动注解)

---

### Task 1: 创建响应 DTO

**Files:**
- Create: `src/modules/permissions/dto/permission-item.dto.ts`
- Create: `src/modules/permissions/dto/permission-group.dto.ts`

- [ ] **Step 1: 创建 PermissionItemDto**

```typescript
export class PermissionItemDto {
  id: number;
  code: string;
  name: string;
  module: string;
  action: string;
}
```

- [ ] **Step 2: 创建 PermissionGroupDto**

```typescript
import { PermissionItemDto } from './permission-item.dto';

export class PermissionGroupDto {
  module: string;
  moduleName: string;
  permissions: PermissionItemDto[];
}
```

- [ ] **Step 3: 提交**

```bash
git add src/modules/permissions/dto/
git commit -m "feat: 添加权限响应 DTO"
```

---

### Task 2: 更新 PermissionsService

**Files:**
- Modify: `src/modules/permissions/permissions.service.ts`

- [ ] **Step 1: 添加 DTO 导入、moduleName 映射表和 findGrouped 方法**

将 `src/modules/permissions/permissions.service.ts` 替换为：

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service';
import { PermissionItemDto } from './dto/permission-item.dto';
import { PermissionGroupDto } from './dto/permission-group.dto';

const MODULE_NAMES: Record<string, string> = {
  article: '文章',
  user: '用户',
  role: '角色',
  system: '系统',
};

@Injectable()
export class PermissionsService {
  constructor(private prismaAdmin: PrismaAdminService) {}

  async findAll(): Promise<PermissionItemDto[]> {
    return this.prismaAdmin.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  async findByModule(module: string): Promise<PermissionItemDto[]> {
    return this.prismaAdmin.permission.findMany({
      where: { module },
      orderBy: { action: 'asc' },
    });
  }

  async findGrouped(): Promise<PermissionGroupDto[]> {
    const permissions = await this.findAll();
    const moduleMap = new Map<string, PermissionItemDto[]>();

    for (const perm of permissions) {
      const list = moduleMap.get(perm.module) || [];
      list.push(perm);
      moduleMap.set(perm.module, list);
    }

    return Array.from(moduleMap.entries()).map(([module, perms]) => ({
      module,
      moduleName: MODULE_NAMES[module] || module,
      permissions: perms,
    }));
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/modules/permissions/permissions.service.ts
git commit -m "feat: PermissionsService 添加返回类型和 findGrouped 分组方法"
```

---

### Task 3: 创建 PermissionsController

**Files:**
- Create: `src/modules/permissions/permissions.controller.ts`

- [ ] **Step 1: 创建 Controller**

```typescript
import { Controller, Get } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGroupDto } from './dto/permission-group.dto';
import { PermissionItemDto } from './dto/permission-item.dto';

@Controller('api/permissions')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  /**
   * 获取所有权限列表（平铺）
   */
  @Get()
  @RequirePermission('system:config')
  async findAll(): Promise<PermissionItemDto[]> {
    return this.permissionsService.findAll();
  }

  /**
   * 获取按模块分组的权限列表
   */
  @Get('modules')
  @RequirePermission('system:config')
  async findGrouped(): Promise<PermissionGroupDto[]> {
    return this.permissionsService.findGrouped();
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/modules/permissions/permissions.controller.ts
git commit -m "feat: 创建 PermissionsController（权限列表 API）"
```

---

### Task 4: 创建 PermissionsModule 并注册到 AppModule

**Files:**
- Create: `src/modules/permissions/permissions.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: 创建 PermissionsModule**

```typescript
import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService, PrismaAdminService],
})
export class PermissionsModule {}
```

- [ ] **Step 2: 在 AppModule 中导入 PermissionsModule**

```typescript
// src/app.module.ts
import { PermissionsModule } from './modules/permissions/permissions.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    RolesModule,
    SystemModule,
    PermissionsModule,  // ← 新增
  ],
  // ...
})
```

- [ ] **Step 3: 提交**

```bash
git add src/modules/permissions/permissions.module.ts src/app.module.ts
git commit -m "feat: 创建 PermissionsModule 并注册到 AppModule"
```

---

### Task 5: 启动验证

- [ ] **Step 1: 启动开发服务器**

```bash
pnpm run start:dev
```

Expected: NestJS 启动成功，无报错，路由表显示 `Mapped {/api/permissions, GET}` 和 `Mapped {/api/permissions/modules, GET}`

- [ ] **Step 2: 验证接口返回**

```bash
# 使用登录获取的 token
curl http://localhost:3000/api/permissions -H "Authorization: Bearer <token>"
```

Expected: 返回平铺的权限数组

```bash
curl http://localhost:3000/api/permissions/modules -H "Authorization: Bearer <token>"
```

Expected: 返回按 module 分组的权限结构

## 验证清单

- [ ] `GET /api/permissions` 返回 200 + 权限数组
- [ ] `GET /api/permissions/modules` 返回 200 + 按 module 分组结构，含 moduleName 中文名
- [ ] 未登录请求返回 401
- [ ] 无 `system:config` 权限的用户请求返回 403
- [ ] Swagger 文档 `/api` 中能看到两个新接口
