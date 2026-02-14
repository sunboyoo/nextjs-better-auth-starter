# 服务端 / 客户端分离规范（供 AGENTS.md 引用）

> 本文件是 AGENTS 执行约束文档。涉及 API、页面、组件改动时，必须遵守以下规则。

## 1. 设计目标
将 `/api/*` 视作可复用服务层，支持多个前端入口（例如 `/dashboard`、`/admin`、未来业务前端）共享同一后端能力。

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  /dashboard  │  │   /admin     │  │   /app-N     │
│   前端 UI    │  │   前端 UI    │  │   前端 UI    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       │   authClient.*  │   fetch()       │
       └────────────┬────┴─────────────────┘
                    │
                    ▼
    ┌──────────────────────────────────────────────────────┐
    │                    /api/* (Server)                   │
    │  ┌─────────────────┐  ┌────────────┐  ┌───────────┐ │
    │  │ /api/auth/[...] │  │ /api/user  │  │ /api/admin│ │
    │  │ Better Auth     │  │            │  │           │ │
    │  │ catch-all       │  │            │  │           │ │
    │  └─────────────────┘  └────────────┘  └───────────┘ │
    │               │              │              │        │
    │           ┌───┴──────────────┴──────────────┘        │
    │           ▼                                          │
    │     ┌──────────┐    ┌───────────────────────┐        │
    │     │ auth.api │    │     db (Drizzle)      │        │
    │     └──────────┘    └───────────────────────┘        │
    │           │                   │                      │
    │           └─────────┬─────────┘                      │
    │                     ▼                                │
    │              ┌───────────┐                           │
    │              │ PostgreSQL│                           │
    │              └───────────┘                           │
    └──────────────────────────────────────────────────────┘
```

## 2. 强制原则

### 2.1 API 层独立
1. `/api/**/route.ts` 禁止依赖 UI 组件与 React 客户端能力。
2. API 只返回数据（JSON/状态码），不承载展示逻辑。
3. API 设计需可被多个前端复用，不耦合单一路由页面。

### 2.2 数据访问边界
1. 允许在服务端路由、服务端工具层访问 `db`。
2. 禁止在 `src/components/**` 与 Client Components 中直接导入 `@/db`。
3. **Server Components**（`page.tsx`、`layout.tsx`）允许直接调用 `auth.api.*` 获取当前用户的会话和认证数据 — 这是 Better Auth 官方推荐的服务端模式。
4. **Server Components** 禁止直接导入 `@/db`；业务数据应通过 API 路由或 server action 获取。
5. **Client Components** 通过以下方式获取数据：
   - `authClient.*`：Better Auth 客户端 SDK（SDK 内部与 `/api/auth/[...all]` 通信）。
   - `fetch` / TanStack Query：调用 `/api/user/*` 或 `/api/admin/*` 路由。
   - `src/data/**` 封装的 query/mutation hooks。

### 2.3 高权限能力边界
1. 高权限操作（例如 admin 管理动作）必须在服务端执行。
2. 必须有显式授权守卫（例如 `requireAdmin()`、`requireAdminAction()`）。
3. 客户端只负责触发，不得直接持有高权限数据库访问能力。

## 3. 目录分层建议（当前项目）

```
src/
├── app/
│   ├── api/                        # 服务端 API（可复用）
│   │   ├── auth/[...all]/          # Better Auth catch-all（认证入口）
│   │   ├── admin/                  # 管理域 API（requireAdminAction 守卫）
│   │   ├── user/                   # 用户域 API（requireAuth + 成员验证守卫）
│   │   └── rbac/                   # 权限查询 API
│   ├── dashboard/                  # 用户前端（user 角色）
│   ├── admin/                      # 管理后台前端（admin 角色）
│   └── auth/                       # 认证页面（登录/注册/2FA等）
├── components/                     # 前端组件层（禁止直接访问 db）
├── data/                           # 前端数据请求封装（TanStack Query hooks）
├── lib/                            # 服务端/通用工具
│   ├── auth.ts                     # Better Auth 服务端配置
│   ├── auth-client.ts              # Better Auth 客户端 SDK（Standard API）
│   ├── auth-admin-client.ts        # Better Auth Admin SDK（隔离）
│   └── api/auth-guard.ts           # 守卫函数（requireAuth/requireAdmin）
└── db/                             # schema + Drizzle 基础设施
```

## 4. 允许/禁止矩阵

| 位置 | 允许 | 禁止 |
|---|---|---|
| `src/app/api/**/route.ts` | `db`、`auth.api.*`（Standard + Admin Plugin）、`extendedAuthApi.*`、服务端工具 | UI 组件、React 客户端 hooks |
| `src/app/**/page.tsx` `layout.tsx` (Server Component) | `auth.api.getSession()`、`auth.api.listSessions()` 等 Standard API 直接调用 | 直接导入 `@/db`、调用 Admin Plugin API |
| `src/components/**`、Client Components | `authClient.*`、`fetch` → API、TanStack Query hooks、`src/data/**` | 直接导入 `@/db`、`authClient.admin.*`、`authAdminClient` |
| `src/data/**` | 前端查询封装、`authClient.*`、`fetch` → `/api/*` | 直接导入 `@/db`、直接写数据库 |
| `src/lib/auth-admin-client.ts` | `adminClient()` 插件 | 被用户端代码导入 |

## 5. Better Auth 数据访问分层规则

根据 Better Auth 官方文档，API 分为两类，项目中必须按角色区分使用：

### 5.1 Standard Auth API（所有认证用户可用）
- **方法**：`getSession`、`listSessions`、`changePassword`、`updateUser`、`listUserAccounts` 等。
- **范围**：只能操作**当前登录用户自身**的数据。
- **服务端调用**：Server Components 中 `auth.api.getSession({ headers: await headers() })`。
- **客户端调用**：`authClient.useSession()`、`authClient.changePassword()` 等。
- **适用区域**：`/dashboard`、`/auth` 页面。

### 5.2 Admin Plugin API（仅 admin 角色可用）
- **方法**：`listUsers`、`createUser`、`banUser`、`setRole`、`removeUser`、`impersonateUser` 等。
- **范围**：可操作**任意用户**的数据。
- **调用方式**：仅在 `/api/admin/*` 路由中通过 `auth.api.*` 或 `extendedAuthApi.*` 服务端调用。
- **守卫**：必须经过 `requireAdminAction(action)` 检查（角色 + 权限矩阵）。
- **禁止**：客户端代码直接调用 Admin Plugin API。

### 5.3 Organization Plugin API
- **用户端**（`/dashboard`）：`authClient.organization.*` — 受组织成员资格限制，只能访问自己所在组织。
- **管理端**（`/api/admin/*`）：`extendedAuthApi.listOrganizations()` — 可访问所有组织（需 admin 守卫）。

## 6. AGENTS 执行检查（提交前自检）

```bash
# 1) API 层不应依赖组件层
rg -n "@/components" src/app/api

# 2) 组件层不应直接访问数据库
rg -n "@/db" src/components

# 3) 非 API 页面不应直接访问数据库
rg -n "@/db" src/app --glob "*.tsx" | rg -v "src/app/api/"

# 4) 用户端代码不应使用 admin 能力（BA-003）
rg -n "authAdminClient|authClient\.admin\." \
  src/app/dashboard \
  src/data/user \
  src/components

# 5) auth-client.ts 不应包含 adminClient 插件
rg -n "adminClient\(" src/lib/auth-client.ts

# 6) 用户端 auth/session/account 流程不应直接查 DB（BA-002）
rg -n "@/db|@/db/schema|drizzle-orm" \
  src/app/dashboard/user-account \
  src/app/dashboard/user-profile \
  src/data/user
```

期望结果：以上命令无输出（或仅为注释/示例文件，需人工确认）。

## 7. 与认证策略联动

本文档与 `docs/policies/better-auth-access-policy.md` 配合执行：

| 策略规则 | 本文对应 | 说明 |
|---|---|---|
| **BA-001** API-First Access | Section 5.1、5.2 | 用户态功能使用 Standard API；admin 使用 Admin Plugin API |
| **BA-002** No Direct DB | Section 2.2、4 | 用户端 auth/session/account 流程禁止 `@/db` |
| **BA-003** Least-Privilege Client | Section 4、5.2 | `authClient` 不含 `adminClient()`；用户代码不调 `admin.*` |
| **BA-004** Admin Isolation | Section 2.3、5.2 | Admin 操作走服务端路由 + 授权守卫；`auth-admin-client.ts` 隔离 |
| **BA-005** Session via Auth API | Section 5.1 | Session 操作使用 `getSession`、`listSessions`、`revokeSession` 等 |
| **BA-006** No Secret Leakage | Section 2.3 | 服务端密钥不暴露到浏览器可执行路径 |
