# Better Auth Organization Options 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/organization/options.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 基本合规。
- 当前已配置组织能力的关键选项，满足多数业务场景。

## 2. 当前关键配置

1. `ac`（内置角色权限定义）
2. `dynamicAccessControl.enabled = true`
3. `invitationExpiresIn`（由常量驱动）
4. `requireEmailVerificationOnInvitation = true`
5. `sendInvitationEmail` 自定义回调

## 3. 风险与差距

1. `teams` 未启用（若业务需要团队层级需额外建设）。
2. 动态角色虽然启用，但实际管理路径大量自定义。

## 4. 代码证据

- `src/lib/auth.ts`
- `src/lib/built-in-organization-role-permissions.ts`

## 5. 建议

1. 建立配置变更评审清单（特别是 invitation 与 dynamicAccessControl）。
2. 在 options 文档中明确哪些能力依赖自定义 API 才完整可用。
