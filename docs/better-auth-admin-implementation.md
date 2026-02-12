# Better Auth Admin 实现审计（当前代码基准）

- 审计日期：2026-02-11
- 审计范围：
  - `src/lib/auth.ts`
  - `src/lib/auth-client.ts`
  - `src/lib/auth-admin-client.ts`
  - `src/lib/api/auth-guard.ts`
  - `src/app/api/admin/**`
  - `src/app/admin/**`
  - `src/utils/auth.ts`
  - `src/utils/users.ts`
  - `src/utils/sessions.ts`

## 1. 概览
项目已启用 Better Auth `admin()` 插件，并构建了较完整的管理员后台能力（用户、会话、组织、应用与角色相关管理）。

相较旧版结论，关键修正：
1. `adminClient()` 不在 `src/lib/auth-client.ts`，而在 `src/lib/auth-admin-client.ts`（隔离正确）。
2. 管理能力主要经由服务端 `/api/admin/*` 路由执行，且统一经过 `requireAdmin()` 授权。
3. 全局会话列表并非直接走 Better Auth 单用户会话接口，而是 `src/utils/sessions.ts` 的跨用户聚合查询。

## 2. 核心安装与边界

| 项目 | 状态 | 说明 |
|---|---|---|
| `admin()` 服务端插件 | ✅ 已实现 | `src/lib/auth.ts` 中配置 `admin({ defaultRole: "user", adminRoles: ["admin"] })`。 |
| `adminClient()` 客户端插件 | ✅ 已实现（隔离） | 仅在 `src/lib/auth-admin-client.ts` 初始化。 |
| 普通客户端隔离 | ✅ 符合 | `src/lib/auth-client.ts` 未引入 `adminClient()`。 |
| 管理接口授权 | ✅ 已实现 | `/api/admin/*` 路由统一 `requireAdmin()`（`src/lib/api/auth-guard.ts`）。 |
| Admin 页面入口守卫 | ✅ 已实现 | `src/app/admin/layout.tsx` 使用 `auth.api.getSession` + `role === "admin"`。 |

## 3. 用户管理能力

| 功能 | 状态 | 说明 |
|---|---|---|
| 创建用户 | ✅ 已实现 | `POST /api/admin/users`，调用 Better Auth admin API `createUser`。 |
| 用户列表 | ✅ 已实现 | `GET /api/admin/users` 基于 `auth.api.listUsers`，并补充账号来源/最近登录。 |
| 设置角色 | ✅ 已实现 | `PATCH /api/admin/users/[userId]`，`action: "set-role"`。 |
| 封禁 / 解封 | ✅ 已实现 | 同一 PATCH 路由调用 `banUser` / `unbanUser`。 |
| 删除用户 | ✅ 已实现 | `DELETE /api/admin/users/[userId]`。 |
| 更新姓名/邮箱 | ✅ 已实现 | `action: "update-user"`。 |
| 邮箱变更验证流触发 | ✅ 已实现 | `POST /api/admin/users/[userId]/trigger-email-change-verification`。 |
| 管理员直接覆盖邮箱 | ✅ 已实现 | 可直接 `adminUpdateUser` 写入邮箱及 `emailVerified`。 |
| 设置用户密码 | ✅ 已实现 | `POST /api/admin/users/set-password`，经 `auth.$context` 进行 hash 并更新/创建 credential。 |

补充：
1. 密码 hash 流程受 HIBP 插件约束（`/set-password` 与相关重置路径已纳入检测范围）。

## 4. 会话管理能力

| 功能 | 状态 | 说明 |
|---|---|---|
| 全站会话列表 | ✅ 已实现 | `GET /api/admin/sessions`，由 `src/utils/sessions.ts` 跨用户聚合。 |
| 撤销单会话 | ✅ 已实现 | `DELETE /api/admin/sessions/[token]` -> `auth.api.revokeUserSession()`。 |
| 撤销用户全部会话 | ✅ 已实现 | `DELETE /api/admin/users/[userId]/sessions` -> `auth.api.revokeUserSessions()`。 |
| 管理员登出其他设备 | ✅ 已实现 | 后台组件调用 `authClient.revokeOtherSessions()`。 |

## 5. Impersonation（用户模拟）

| 功能 | 状态 | 说明 |
|---|---|---|
| 发起模拟登录 | ❌ 未实现 | 未接入 `impersonateUser` 的服务端/前端流程。 |
| 停止模拟登录 | ❌ 未实现 | 未实现 stop-impersonating 动作与全局提示。 |
| `impersonatedBy` 展示 | ✅ 仅展示 | 会话表可展示该字段，但无“发起/停止”入口。 |

## 6. 超出 Admin 插件基础能力的自定义后台
除 Better Auth Admin 的用户/会话能力外，后台还实现了大量自定义域模型管理：
1. 组织管理（`/api/admin/organizations/*`）。
2. 组织成员与组织角色管理（`/api/admin/organizations/[organizationId]/members|roles`）。
3. 应用/资源/动作管理（`/api/admin/apps/*`）。
4. 组织应用角色与成员分配能力。

这些模块主要依赖 `requireAdmin()` + Drizzle 业务表，不等同于 Better Auth Admin 插件原生 endpoint 集。

## 7. 与访问策略对齐（`better-auth-access-policy.md`）
1. ✅ `src/lib/auth-client.ts` 不包含 `adminClient()`。
2. ✅ `adminClient()` 隔离在 `src/lib/auth-admin-client.ts`。
3. ✅ 高权限操作在服务端执行，且有显式管理员鉴权（`requireAdmin()`）。

## 8. 建议后续工作
1. 补齐 Impersonation（发起、停止、Banner 提示、审计日志）。
2. 对关键管理动作（删用户、改密码、改邮箱、批量踢会话）补充审计日志。
3. 按风险级别引入二次确认或二次验证机制。
