# Better Auth Admin 实现审计（当前代码基准）

- 审计日期：2026-02-12
- 审计范围：
  - `src/lib/auth.ts`
  - `src/lib/auth-client.ts`
  - `src/lib/auth-admin-client.ts`
  - `src/lib/auth-api.ts`
  - `src/lib/api/auth-guard.ts`
  - `src/lib/api/admin-audit.ts`
  - `src/app/api/admin/**`
  - `src/app/admin/**`
  - `src/utils/auth.ts`
  - `src/utils/sessions.ts`

## 1. 概览

项目已启用 Better Auth `admin()` 插件，后台管理能力完整，且本轮完成了以下关键收敛：
1. `/api/admin/*` 从粗粒度 `requireAdmin()` 收敛为动作级 `requireAdminAction(...)`。
2. 关键管理动作新增统一审计日志落盘（`admin_audit_log`）。
3. Impersonation 已补齐“发起 + 停止”全链路。
4. `auth.api` 扩展调用统一收口到 `src/lib/auth-api.ts`，移除分散类型断言。

## 2. 核心安装与边界

| 项目 | 状态 | 说明 |
|---|---|---|
| `admin()` 服务端插件 | ✅ 已实现 | `src/lib/auth.ts` 中配置 `admin({ defaultRole: "user", adminRoles: ["admin"] })`。 |
| `adminClient()` 客户端插件 | ✅ 已实现（隔离） | 仅在 `src/lib/auth-admin-client.ts` 初始化。 |
| 普通客户端隔离 | ✅ 符合 | `src/lib/auth-client.ts` 未引入 `adminClient()`。 |
| 管理接口授权 | ✅ 已实现 | `/api/admin/*` 使用 `requireAdminAction(...)`，支持动作级角色/权限矩阵。 |
| Admin 页面入口守卫 | ✅ 已实现 | `src/app/admin/layout.tsx` 使用 `auth.api.getSession` + 角色判定。 |

## 3. 用户与会话管理能力

| 功能 | 状态 | 说明 |
|---|---|---|
| 创建/查询/更新/删除用户 | ✅ 已实现 | 统一经 Better Auth Admin API（`createUser`、`adminUpdateUser`、`removeUser` 等）。 |
| 角色设置、封禁/解封、改密 | ✅ 已实现 | 对应动作均纳入 `requireAdminAction` 与审计日志。 |
| 单会话/全会话撤销 | ✅ 已实现 | `revokeUserSession` / `revokeUserSessions`。 |
| 会话列表 | ✅ 已实现 | 单用户查询优先官方 `listUserSessions`，全局查询保留管理端聚合。 |
| 邮箱验证/邮箱变更触发 | ✅ 已实现 | 管理端触发端点均已接入审计日志。 |

## 4. Impersonation（用户模拟）

| 功能 | 状态 | 说明 |
|---|---|---|
| 发起模拟登录 | ✅ 已实现 | 管理端用户操作支持 `impersonateUser`。 |
| 停止模拟登录 | ✅ 已实现 | `stopImpersonating` 已落地。 |
| UI 入口 | ✅ 已实现 | 用户操作菜单已有 impersonate 入口。 |
| 审计记录 | ✅ 已实现 | 发起与关键用户动作均可追踪。 |

## 5. 审计与可追溯性

1. 新增 `admin_audit_log` 表，记录：
   - 操作人、动作、目标类型/目标 ID
   - 请求来源 IP、User-Agent
   - 可选 metadata（字段变更、组织上下文等）
2. 用户、会话、组织、成员、角色、邀请、应用、资源、动作与组织应用角色分配等关键管理端动作均已写审计。

## 6. 与访问策略对齐（`better-auth-access-policy.md`）

1. ✅ `src/lib/auth-client.ts` 不包含 `adminClient()`。
2. ✅ `adminClient()` 仅在 `src/lib/auth-admin-client.ts`。
3. ✅ 高权限动作全部服务端执行，并有显式鉴权与动作级授权。

## 7. 后续建议

1. 对最高风险动作（删用户、删组织、批量踢会话）引入二次确认/强验证（如 step-up）。
2. 将 `admin_audit_log` 接入集中审计检索与告警平台。
