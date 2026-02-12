# Better Auth Admin Access Control 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/admin/access-control.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 主要合规。
- 已实现平台级管理员门禁、动作级授权矩阵、以及关键管理动作审计链路。
- 剩余风险主要在“官方组织权限 + 应用自定义 RBAC”双轨并存的长期治理复杂度。

## 2. 已实现能力

1. 所有 `/api/admin/**` 路由都通过 `requireAdmin()` 守卫。
2. `requireAdminAction()` 基于动作矩阵执行角色校验，并对关键动作叠加 `userHasPermission` 校验。
3. `authAdminClient` 与普通 `authClient` 隔离，避免用户侧误用 admin 插件。
4. 管理端高风险写操作已接入 `writeAdminAuditLog` 统一审计（用户、会话、组织、角色、邀请、应用/RBAC）。

## 3. 主要差距与风险

1. 组织/应用扩展 RBAC 与 admin 角色体系并行，存在长期一致性维护成本。

## 4. 代码证据

- `src/lib/api/auth-guard.ts`
- `src/app/api/admin/**`
- `src/lib/api/admin-audit.ts`
- `src/lib/auth.ts`（`admin({ defaultRole, adminRoles })`）
- `src/lib/auth-client.ts`
- `src/lib/auth-admin-client.ts`

## 5. 建议

1. 为 `requireAdminAction` 增加契约测试，覆盖关键动作的 allow/deny 组合。
2. 将组织官方权限与应用自定义 RBAC 的边界文档化，降低双轨模型维护成本。
