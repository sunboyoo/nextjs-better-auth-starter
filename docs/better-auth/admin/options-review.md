# Better Auth Admin Options 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/admin/options.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 基本合规。
- 当前仅显式配置了核心选项：`defaultRole` 与 `adminRoles`。
- 其余高级选项走默认行为，满足当前系统规模，但在治理层面仍有增强空间。

## 2. 当前配置摘要

1. `defaultRole: "user"`
2. `adminRoles: ["admin"]`
3. 未见额外自定义 admin 权限选项（沿用默认逻辑）

## 3. 风险与边界

1. 单 admin 角色模型在组织扩展后可能过于粗粒度。
2. 缺少对“高危操作二次确认/二次验证”的策略级配置。
3. 默认行为依赖较多，升级 Better Auth 后需重点回归。

## 4. 代码证据

- `src/lib/auth.ts`（`admin(...)` 配置段）
- `src/lib/api/auth-guard.ts`

## 5. 建议

1. 预留多管理角色策略（如 `security-admin`、`support-admin`）。
2. 将高风险动作的策略化约束写入配置/中间层而非散落在 UI。
