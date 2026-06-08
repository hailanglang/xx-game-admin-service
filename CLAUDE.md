# CLAUDE.md

该文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 构建与开发命令

```bash
# 安装依赖
pnpm install

# 开发服务器（watch 模式）
pnpm run start:dev

# 生产构建
pnpm run build

# 生产启动
pnpm run start:prod

# 代码检查（ESLint + Prettier）
pnpm run lint

# 格式化代码
pnpm run format
```

## 测试命令

```bash
# 运行所有单元测试
pnpm run test

# Watch 模式运行测试
pnpm run test:watch

# 测试覆盖率
pnpm run test:cov

# 运行单个测试文件
pnpm jest src/app.controller.spec.ts

# 运行 e2e 测试
pnpm run test:e2e

# 调试测试
pnpm run test:debug
```

## 项目结构

NestJS 11 应用（`@nestjs/core`、`@nestjs/platform-express`）。

```
src/
├── main.ts              # 启动入口 — 创建 NestFactory，监听 PORT ?? 3000
├── app.module.ts        # 根模块（imports、controllers、providers）
├── app.controller.ts    # GET / — 返回 "Hello World!"
├── app.controller.spec.ts
└── app.service.ts       # 业务逻辑服务
```

### 架构

- **Module** → **Controller** → **Service** — 标准 NestJS 分层架构。
- AppModule 为根模块；功能模块应添加在 `src/<feature>/` 目录下，包含各自的 controller/service。
- 单元测试使用 Jest (ts-jest)，测试文件与源码同目录，命名为 `*.spec.ts`。
- E2E 测试位于 `test/` 目录（通过 `test/jest-e2e.json` 配置）。

### 关键配置文件

| 文件 | 用途 |
|------|------|
| `tsconfig.json` | ES2023 目标，nodenext 模块系统，启用装饰器 |
| `tsconfig.build.json` | 构建配置（排除 `*.spec.ts`） |
| `nest-cli.json` | NestJS CLI 配置（`deleteOutDir: true`） |
| `eslint.config.mjs` | ESLint 9 扁平配置 — `@typescript-eslint`、`prettier`、关闭 `no-explicit-any` |
| `.prettierrc` | 单引号、尾逗号 |

### 工具链

- **包管理器**：pnpm
- **测试**：Jest 30 + ts-jest（测试环境：node）
- **代码检查**：ESLint 9 扁平配置 + typescript-eslint + Prettier
- **TypeScript**：v5.7，启用 strictNullChecks，禁用 noImplicitAny

### 说明

该项目通过 `nest new` 初始化，当前为初始状态，仅包含默认的 `Hello World!` 端点。
