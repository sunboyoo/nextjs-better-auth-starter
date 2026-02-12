# Better Auth Admin Schema 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/admin/schema.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 完整合规。
- Admin 相关核心字段在当前 schema 中已具备，且索引与约束较完整。

## 2. 关键字段覆盖

1. 用户角色与封禁：`user.role`、`user.banned`、`user.banReason`、`user.banExpires`。
2. 会话管理扩展：`session.impersonatedBy`、`session.activeOrganizationId`。
3. 账户与会话关系索引齐全，满足后台管理查询场景。

## 3. 质量评估

1. 主键/唯一约束完备。
2. 常用查询字段（用户、会话、provider）均有索引。
3. 与 admin 后台当前能力（用户、会话、组织）匹配。

## 4. 代码证据

- `src/db/schema.ts`
- `src/app/api/admin/users/**`
- `src/app/api/admin/sessions/**`

## 5. 建议

1. 若后续启用 impersonation，建议补审计事件表。
2. 会话超大规模场景可评估额外组合索引（按后台查询模式）。
