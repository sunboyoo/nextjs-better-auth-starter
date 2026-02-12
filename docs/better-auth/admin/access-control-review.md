# Better Auth Admin Access Control 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/admin/access-control.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：⚠️ 部分合规。
- 当前已实现平台级管理员门禁（`role === "admin"`）与服务端统一守卫。
- 仍缺少细粒度权限策略（例如“可封禁不可删用户”）与 `userHasPermission/hasPermission` 风格权限校验。

## 2. 已实现能力

1. 所有 `/api/admin/**` 路由都通过 `requireAdmin()` 守卫。
2. `requireAdmin()` 基于 `auth.api.getSession()` 取会话并校验用户角色。
3. `authAdminClient` 与普通 `authClient` 隔离，避免用户侧误用 admin 插件。

## 3. 主要差距与风险

1. 权限模型是“单角色硬判断”，缺少动作级授权矩阵。
2. 缺少 admin 操作审计链路（谁在何时执行了哪类高风险操作）。
3. 组织/应用扩展 RBAC 与 admin 角色体系并行，存在长期一致性维护成本。

## 4. 代码证据

- `src/lib/api/auth-guard.ts`
- `src/app/api/admin/**`
- `src/lib/auth.ts`（`admin({ defaultRole, adminRoles })`）
- `src/lib/auth-client.ts`
- `src/lib/auth-admin-client.ts`

## 5. 建议

1. 引入动作级授权层（至少覆盖删除用户、改密码、批量踢会话等高风险动作）。
2. 在 admin API 路由层增加统一审计日志中间层。
3. 将关键管理能力的授权决策抽象为可复用 helper，避免页面/路由分散判断。
