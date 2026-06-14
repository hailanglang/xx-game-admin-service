# Permission API 设计文档

## 背景

当前项目已有权限系统的基础设施：

- `permissions` 表存储权限点，seed 脚本定义了 article/user/role/system 四个模块共 16 个权限
- `role_permissions` 关联表实现角色-权限多对多关系
- `assignPermissions` API (`POST /api/roles/:id/permissions`) 已实现，支持为角色分配权限
- `PermissionsService` 已存在，包含 `findAll()` 和 `findByModule()` 方法
- 登录接口返回 `currentUser.permissions: string[]`，用于前端动态菜单控制

但存在以下缺失：

- `PermissionsModule` 未创建，`PermissionsService` 未注册到 Nest 容器
- 缺少 `PermissionsController`，前端无法获取权限列表
- 因此 `assignPermissions` 虽然逻辑正确，但前端不知道有哪些 permissionId 可用

## 目标

1. 提供权限列表 API，支持按 module 分组返回
2. 让前端能获取权限数据，渲染权限分配 UI
3. 支持前端根据当前用户的 `permissions` 数组实现动态菜单

## 设计

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/modules/permissions/permissions.module.ts` | PermissionsModule，注册 Service 和 Controller |
| `src/modules/permissions/permissions.controller.ts` | 提供权限查询接口 |
| `src/modules/permissions/dto/permission-group.dto.ts` | 按 module 分组的响应 DTO |

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/modules/permissions/permissions.service.ts` | 添加返回类型 DTO，新增 `findGrouped()` 方法 |
| `src/app.module.ts` | 导入 PermissionsModule |

### API 接口

#### `GET /api/permissions`

返回所有权限的平铺列表。

```json
[
  {
    "id": 1,
    "code": "article:create",
    "name": "创建文章",
    "module": "article",
    "action": "create"
  },
  ...
]
```

#### `GET /api/permissions/modules`

返回按 module 分组的结构，前端直接渲染为模块 → 权限点列表。

```json
[
  {
    "module": "article",
    "moduleName": "文章",
    "permissions": [
      { "id": 1, "code": "article:create", "name": "创建文章", "action": "create" },
      { "id": 2, "code": "article:read",   "name": "查看文章", "action": "read" },
      { "id": 3, "code": "article:update", "name": "编辑文章", "action": "update" },
      { "id": 4, "code": "article:delete", "name": "删除文章", "action": "delete" }
    ]
  },
  {
    "module": "user",
    "moduleName": "用户",
    "permissions": [ ... ]
  },
  {
    "module": "role",
    "moduleName": "角色",
    "permissions": [ ... ]
  },
  {
    "module": "system",
    "moduleName": "系统",
    "permissions": [ ... ]
  }
]
```

### moduleName 映射

`moduleName` 通过静态映射表从 `module` 字段转换，不依赖数据库额外字段：

```typescript
const MODULE_NAMES: Record<string, string> = {
  article: '文章',
  user: '用户',
  role: '角色',
  system: '系统',
};
```

### 权限控制

两个接口都要求 `@RequirePermission('system:config')` 权限（系统配置级别），仅管理员可访问。

### 前端动态菜单

后端无需额外改动。登录后 `currentUser.permissions` 已包含权限 code 数组，前端据此：

1. **路由守卫** — 无权限的页面跳转 403
2. **菜单显隐** — 只显示当前用户有权限的模块
3. **按钮级控制** — 根据 `permissions` 判断是否显示"新增/编辑/删除"按钮

### 数据流

```
seed 脚本 → 数据库 permissions 表
                ↓
         GET /api/permissions/modules
                ↓
         前端渲染权限分配勾选框
                ↓
         用户勾选 → POST /api/roles/:id/permissions
                      { permissionIds: [1, 2, 5, ...] }
                ↓
         该角色用户重新登录
                ↓
         currentUser.permissions 更新 → 前端动态菜单更新
```

## 不在此范围

- 权限点的 CRUD（增删改）—— 权限点由 seed 脚本定义，不通过 API 动态管理
- 前端动态路由的具体实现 —— 属于前端项目范围
