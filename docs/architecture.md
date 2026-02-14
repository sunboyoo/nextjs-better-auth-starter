# 应用技术架构 (Application Architecture)

## 技术分层概览 (客户端 → 服务端)

本应用采用标准的 Next.js App Router 架构，实现了客户端与服务端的严格职责分离。数据流共分为 5 层：

### 1. 展示层 (Presentation Layer)

- **🚀 运行环境**: **Client (Browser) + Server (Node.js)**
- **职责**：负责 UI 渲染、用户交互、本地状态管理。
- **技术栈**：
  - **Server Components (RSC)**：默认组件类型，在服务端渲染。用于页面布局、数据预加载、受保护路由的会话检查。
  - **Client Components (`"use client"`)**：在浏览器运行。用于交互式 UI、表单、实时状态。
- **核心库**：Shadcn UI, Lucide Icons, Framer Motion, `next/navigation`。
- **📊 数据访问方式**:
  - **Props**: 从父组件（通常是 Server Component）接收预加载数据。
  - **Hooks**: 使用 `src/data/` 目录中封装的 TanStack Query Hooks 获取异步数据。
  - **Store**: 读取本地状态 (Context) 或 URL searchParams。

### 2. 客户端数据获取层 (Client Data Fetching Layer)

- **🚀 运行环境**: **Client (Browser)**
- **职责**：作为 API 的调用方，负责发起 HTTP 请求、管理客户端缓存。
- **组件**：
  - **TanStack Query** (`@tanstack/react-query`)：项目的核心数据获取库。
    - Query Hooks (`useQuery`)：封装在 `src/data/` 中，如 `useSessionQuery`、`useOrganizationListQuery` 等。
    - Mutation Hooks (`useMutation`)：封装在 `src/data/` 中，如 `useChangePasswordMutation`、`useRevokeSessionMutation` 等。
    - Query Keys：每个域使用独立的 key factory（如 `userKeys`、`organizationKeys`）管理缓存失效。
    - Query Client：`src/data/query-client.ts` 管理服务端/客户端实例，支持 SSR hydration。
  - **`authClient`** (`src/lib/auth-client.ts`)：Better Auth 客户端 SDK。
    - `authClient.useSession()`：客户端获取当前会话的核心 Hook。
    - `authClient.signIn.email()`、`authClient.signUp.email()` 等：认证操作。
    - `authClient.organization.*`：组织管理操作。
- **📊 数据访问方式**:
  - **HTTP Fetch**: 向后端 API 端点 (`/api/...`) 发起 `fetch` 请求（通过 TanStack Query 封装）。
  - **Auth Client SDK**: 调用 `authClient.*` 方法，SDK 内部向 `/api/auth/[...all]` 发起请求与 Better Auth 后端通信。

### 3. 服务端 API 控制层 (Server API Controller Layer)

- **🚀 运行环境**: **Server (Node.js)**
- **职责**：作为 API 的服务端入口，接收请求、解析参数。
- **位置**：Next.js Route Handlers (`src/app/api/.../route.ts`)。
- **路由分组**：
  - **`/api/auth/[...all]`** — Better Auth 的 Catch-all 路由。使用 `toNextJsHandler(auth)` 将所有认证请求委托给 Better Auth 引擎处理（登录、注册、会话管理、OAuth 回调、2FA 等）。
  - **`/api/admin/*`** — 管理员 API。受 `requireAdmin()` / `requireAdminAction()` 守卫保护。
  - **`/api/user/*`** — 用户 API。受 `requireAuth()` + 组织成员资格验证保护。
  - **`/api/rbac/*`** — 权限查询 API。受 `requireAuth()` + 自定义授权检查（仅 admin 或成员本人可查询）。
- **📊 数据访问方式**:
  - **Request Object**: 解析 HTTP Request Body (`req.json()`) 和 Query Parameters。
  - **Route Params**: 从动态路由路径中提取参数 (如 `[organizationId]`, `[appId]`)。
  - **Headers**: 读取请求头信息，传递给 Auth Guard 进行身份验证。

### 4. 业务逻辑与守卫层 (Service Logic & Guard Layer)

- **🚀 运行环境**: **Server (Node.js)**
- **职责**：执行核心业务规则、权限验证。
- **核心模块** (`src/lib/api/auth-guard.ts`)：
  - **`requireAuth()`**：验证用户已登录（任何角色），内部调用 `auth.api.getSession()`。
  - **`requireAdmin()`**：验证用户为 admin 角色。
  - **`requireAdminAction(action)`**：验证 admin 角色 + 基于 `ADMIN_ACTION_ROLE_MATRIX` 的操作级权限 + `ADMIN_ACTION_PERMISSION_MATRIX` 的细粒度权限检查。
  - **`verifyOrgMembership()`**：在用户 API 路由中使用，查询 `member` 表验证用户的组织成员资格。
- **数据验证**：Zod Schema 用于请求体验证。
- **路由保护模式**：
  - **Layout-based Protection**：`src/app/dashboard/layout.tsx` 在服务端通过 `auth.api.getSession()` 检查会话，未认证用户重定向到 `/auth/sign-in`。项目**不使用** `middleware.ts` 进行路由保护。
  - **API Route Protection**：每个 Route Handler 入口调用对应的 Guard 函数。
- **📊 数据访问方式**:
  - **Auth Server SDK**: 调用 `auth.api.getSession({ headers })` 验证当前请求的会话状态。
  - **RBAC Checks**: 调用 `requireAdminAction()` 进行角色矩阵和权限矩阵双重检查。
  - **Org Membership**: 调用 `verifyOrgMembership()` 查询数据库验证组织成员资格。

### 5. 数据访问层 (Data Access Layer)

- **🚀 运行环境**: **Server (Node.js)**
- **职责**：与数据库交互。
- **📊 数据访问方式**:

| 数据类型 | 访问方式 | 工具/对象 | 说明 |
| :--- | :--- | :--- | :--- |
| **业务数据** | **直接 DB 访问** | `db` (Drizzle ORM) | 业务数据（Apps, Resources, Teams, Organizations 等）通过 Drizzle 直接操作 PostgreSQL。支持复杂查询和事务。 |
| **Auth 读操作** | **Auth SDK** | `auth.api` (Server) | 获取 Session、用户信息等读取操作，优先使用 Better Auth SDK，它自动处理缓存和安全逻辑。 |
| **Auth 写操作** | **Auth SDK** | `auth.api` (Server) | 创建用户、修改密码、封禁用户等操作，**必须**通过 Better Auth SDK 进行，以确保哈希加密、Token 生成等安全流程正确执行。 |
| **客户端 Auth** | **Auth Client** | `authClient` (Browser) | 客户端的登录、退出、获取当前 Session，通过 Better Auth 客户端 SDK 与 `/api/auth/[...all]` 通信。 |
| **Admin Auth** | **Admin SDK** | `authAdminClient` (Server) | 管理员操作隔离于 `src/lib/auth-admin-client.ts`，不暴露给用户端代码 (BA-003/BA-004)。 |

---

## Dashboard vs Admin 数据访问模式对比

根据 Better Auth 官方文档，其 API 分为两类：
- **Standard Auth API**：`getSession`、`listSessions`、`changePassword`、`updateUser` 等 — 只能操作**当前登录用户自身**的数据。
- **Admin Plugin API**：`listUsers`、`createUser`、`banUser`、`setRole`、`removeUser`、`impersonateUser` 等 — 可操作**任意用户**的数据，需要 `admin` 角色。

项目中 `/dashboard`（user 角色）和 `/admin`（admin 角色）严格按照这一分类使用不同的 API 和数据访问路径。

### Dashboard (`/dashboard`) — user 角色

> 核心原则：**只能访问自身数据**，使用 Standard Auth API + Organization Client API。

| 层级 | 组件类型 | 数据来源 | 具体调用 |
| :--- | :--- | :--- | :--- |
| Layout 路由保护 | Server Component | `auth.api` (Standard) | `auth.api.getSession()` → 未认证则 redirect |
| 用户账户/个人资料 | Server Component | `auth.api` (Standard) | `auth.api.getSession()`, `listSessions()`, `listUserAccounts()` |
| 组织列表/成员/团队/邀请 | Client Component | `authClient` (Standard + Org Plugin) | `authClient.useListOrganizations()`, `authClient.organization.listMembers()`, `authClient.organization.listTeams()` |
| Dashboard 首页卡片 | Client Component | `authClient` (Standard + Org Plugin) | `authClient.useSession()`, `authClient.useActiveOrganization()`, `authClient.organization.listUserInvitations()` |
| 应用/资源 (业务数据) | Client Component | TanStack Query → `/api/user/*` | `fetch(/api/user/organizations/[orgId]/apps)` |
| 修改密码/撤销会话 | Client Component | `authClient` (Standard) via `src/data/user/` | `authClient.changePassword()`, `authClient.revokeSession()` (封装为 TanStack Query mutations) |

**Dashboard 关键约束**:
- **禁止直接 DB 访问** (BA-002)：`/dashboard` 页面和 `src/data/user/` 不导入 `@/db`。
- **禁止 admin API** (BA-003)：不使用 `authClient.admin.*` 或 `authAdminClient`。
- `/api/user/*` 路由中的 `db` 访问仅针对**业务数据表** (apps, resources, member)，不触碰 auth 核心表。
- **已知例外**：部分 `/api/user/*` 组织成员路由对 `user` 表执行**只读 JOIN 查询**（仅 `SELECT id, name, email, image`），用于在成员/邀请列表中附带用户显示信息。Better Auth 没有提供"根据 userId 批量获取用户公开信息"的 Standard API，因此该模式属于已知且受控的妥协。

### Admin (`/admin`) — admin 角色

> 核心原则：**可访问全局数据**，使用 Admin Plugin API + 直接 DB 访问补充。

| 层级 | 组件类型 | 数据来源 | 具体调用 |
| :--- | :--- | :--- | :--- |
| Layout 角色检查 | Server Component | `auth.api` (Standard) | `auth.api.getSession()` → 非 admin 则拒绝 |
| 用户管理表格 | Client Component | TanStack Query → `/api/admin/users` | `fetch(/api/admin/users)` → 服务端调用 `auth.api.listUsers()` (Admin Plugin) |
| 组织管理表格 | Client Component | TanStack Query → `/api/admin/organizations` | `fetch(/api/admin/organizations)` → 服务端调用 `extendedAuthApi.listOrganizations()` + `db` 聚合 |
| 会话管理表格 | Client Component | TanStack Query → `/api/admin/sessions` | `fetch(/api/admin/sessions)` → 服务端使用 `db` 查询跨用户会话 |
| 应用管理 (CRUD) | Client Component | TanStack Query → `/api/admin/apps` | `fetch(/api/admin/apps)` → 服务端直接 `db` 操作 |
| 用户创建/封禁/角色 | Client Component | TanStack Query → `/api/admin/users` | POST → 服务端调用 `extendedAuthApi.createUser()`, `extendedAuthApi.banUser()`, `extendedAuthApi.setRole()` |

**Admin 关键特征**:
- **管理操作不使用 `authClient.*`**：Admin UI 组件的管理操作（管理他人数据）不直接调用 Better Auth 客户端 SDK，全部通过 TanStack Query → `/api/admin/*` API 路由。管理员**自身会话操作**（`authClient.signOut()`、`authClient.revokeOtherSessions()`）属于 Standard API，允许直接调用。
- **混合数据源**：API 路由中同时使用 `auth.api`(Admin Plugin) + `db`(Drizzle)。例如 `getUsers()` 先用 `auth.api.listUsers()` 获取用户列表，再用 `db` 查询 `account` 和 `session` 表补充 Provider 列表和最后登录时间（Better Auth API 不返回这些字段）。
- **`extendedAuthApi`** (`src/lib/auth-api.ts`)：对 `auth.api` 的类型增强包装，提供 Admin Plugin 和 Organization Plugin 方法的完整类型定义。
- **Guard 层更严格**：`requireAdminAction(action)` 执行角色矩阵 + 细粒度权限矩阵双重检查。

### 对比总结

| 维度 | Dashboard (user) | Admin (admin) |
| :--- | :--- | :--- |
| **操作范围** | 仅自身数据 | 跨用户全局数据 |
| **Better Auth API 类型** | Standard API (getSession, listSessions...) | Admin Plugin API (listUsers, banUser, setRole...) |
| **客户端 SDK 使用** | `authClient.*` (直接调用) | 管理操作不使用，通过 `/api/admin/*` 中转；自身会话操作（signOut 等）允许直接调用 |
| **组织数据** | `authClient.organization.*` (受成员资格限制) | `extendedAuthApi.listOrganizations()` (全局可见) |
| **DB 直接访问** | 仅在 `/api/user/*` 中访问业务表 | `/api/admin/*` 中访问业务表 + auth 辅助表 |
| **Auth 核心表 DB 访问** | 禁止 (BA-002) | 允许 (用于补充 Better Auth API 不返回的字段) |
| **Guard 函数** | `requireAuth()` + `verifyOrgMembership()` | `requireAdminAction(action)` (角色 + 权限矩阵) |
| **审计日志** | 无 | `writeAdminAuditLog()` 记录管理操作 |

### 为什么 Admin 需要混合使用 Auth API + DB？

Better Auth Admin Plugin 的 `listUsers` 等 API 不返回某些跨表关联数据（如用户的 OAuth Provider 列表、最后登录时间）。项目的处理方式是：

1. **主数据**通过 `auth.api.listUsers()` 获取（保证分页、搜索、过滤逻辑由 Better Auth 处理）。
2. **补充数据**通过 `db` 查询 `account` 和 `session` 表获取。
3. 在 `src/utils/users.ts` 中合并两个数据源。

这符合 Better Auth 的设计理念：核心 auth 操作（创建/封禁/设角色）必须通过 SDK，只在 SDK 能力不足时才用 DB 补充**只读**数据。

---

## Better Auth 插件架构

项目使用大量 Better Auth 插件，每个插件需在服务端和客户端**成对配置**：

| 功能 | 服务端插件 (auth.ts) | 客户端插件 (auth-client.ts) |
| :--- | :--- | :--- |
| 组织/多租户 | `organization()` | `organizationClient()` |
| 二步验证 | `twoFactor()` | `twoFactorClient()` |
| 多会话 | `multiSession()` | `multiSessionClient()` |
| Passkey (WebAuthn) | `passkey()` | `passkeyClient()` |
| Email OTP | `emailOTP()` | `emailOTPClient()` |
| 手机号 | `phoneNumber()` | `phoneNumberClient()` |
| Magic Link | `magicLink()` | `magicLinkClient()` |
| 用户名 | `username()` | `usernameClient()` |
| OAuth Provider | `oauthProvider()` | `oauthProviderClient()` |
| 设备授权 | `deviceAuthorization()` | `deviceAuthorizationClient()` |
| Google One Tap | `oneTap()` | `oneTapClient()` |
| Stripe 订阅 | `stripe()` (可选) | `stripeClient()` (可选) |
| Admin 管理 | `admin()` | `adminClient()` — **仅在** `auth-admin-client.ts` |

> **安全约束 (BA-003)**：`adminClient()` 严格隔离在 `src/lib/auth-admin-client.ts` 中，禁止在 `src/lib/auth-client.ts` 或用户端代码中引入。

---

## 架构交互图

```mermaid
graph TD
    subgraph Browser [Client Environment]
        subgraph DashboardUI [/dashboard — user 角色]
            DashPage[Client Component]
            DashAuthClient[authClient SDK<br/>Standard + Org API]
            DashTQ[TanStack Query]
        end
        subgraph AdminUI [/admin — admin 角色]
            AdminPage[Client Component]
            AdminTQ[TanStack Query]
        end
    end

    subgraph NodeServer [Server Environment]
        RSC[Server Component / Layout<br/>auth.api.getSession]
        CatchAll[Better Auth Catch-all<br/>/api/auth/...]
        UserRoute[/api/user/* Route<br/>requireAuth + verifyOrgMembership]
        AdminRoute[/api/admin/* Route<br/>requireAdminAction]
        AuthStd[auth.api Standard API<br/>getSession, listSessions...]
        AuthAdmin[auth.api Admin Plugin API<br/>listUsers, banUser, setRole...]
        ExtApi[extendedAuthApi<br/>listOrganizations, createUser...]
        ORM[Drizzle ORM]
    end

    subgraph DB [Database]
        postgres[(PostgreSQL)]
    end

    %% Dashboard flows
    DashPage --> DashAuthClient
    DashAuthClient -->|/api/auth/...| CatchAll
    CatchAll --> AuthStd
    DashPage --> DashTQ
    DashTQ -->|fetch /api/user/*| UserRoute
    UserRoute --> AuthStd
    UserRoute -->|业务数据| ORM

    %% Admin flows
    AdminPage --> AdminTQ
    AdminTQ -->|fetch /api/admin/*| AdminRoute
    AdminRoute --> AuthAdmin
    AdminRoute --> ExtApi
    AdminRoute -->|业务数据 + auth 补充| ORM

    %% Server Component (both)
    RSC --> AuthStd

    %% Database
    AuthStd --> postgres
    AuthAdmin --> postgres
    ORM --> postgres
```

---

## 认证配置 Profile 系统

项目支持通过环境变量 `AUTHENTICATION_PROFILE` 切换认证方式组合：

- **配置目录**：`src/config/authentication/`
- **Profile 示例**：`PROFILE_IDENTIFIER_FIRST_EMAIL`、`PROFILE_IDENTIFIER_FIRST_PHONE`、`PROFILE_IDENTIFIER_FIRST_USERNAME` 等。
- **作用**：控制登录/注册页面显示哪些认证方式（邮箱密码、手机号、用户名、社交登录等）。

---

## 代码映射示例

| 场景 | 抽象层级 | 运行环境 | 具体实现 |
| :--- | :--- | :--- | :--- |
| **Dashboard 路由保护** | 展示层 | Server (RSC) | `auth.api.getSession()` → 未认证 → `redirect("/auth/sign-in")` |
| **查询应用列表** | 数据访问 | Server | `db.select().from(apps)...` (直接 DB) |
| **创建新应用** | 数据访问 | Server | `db.insert(apps).values(...)` (直接 DB) |
| **获取当前用户** | 业务逻辑 | Server | `await auth.api.getSession({ headers })` (Auth SDK) |
| **客户端获取会话** | 数据获取 | Client | `authClient.useSession()` 或 `useSessionQuery()` (TanStack Query) |
| **前端登录** | 数据获取 | Client | `await authClient.signIn.email(...)` (Auth Client) |
| **验证组织成员** | 守卫层 | Server | `verifyOrgMembership(userId, orgId)` → 查询 `member` 表 |
| **管理员封禁用户** | 守卫层 + 数据访问 | Server | `requireAdminAction("users.ban")` → `auth.api.banUser(...)` (Admin 插件) |
