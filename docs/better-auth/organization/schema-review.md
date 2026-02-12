# Better Auth Organization Schema 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/organization/schema.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 完整合规。
- Organization 核心表结构完整，索引与关系定义清晰。

## 2. 覆盖情况

1. `organization`、`member`、`invitation` 已完整定义。
2. `session.activeOrganizationId` 已实现。
3. `organizationRole` 已实现，用于动态角色存储。
4. 外键与级联删除配置完整。

## 3. 风险与差距

1. `team`/`teamMember` 未实现（当前属于未启用可选能力）。
2. 动态角色与业务 RBAC 扩展并行时需注意语义一致性。

## 4. 代码证据

- `src/db/schema.ts`

## 5. 建议

1. 若未来启用 Teams，需同步补齐 invitation/session 相关字段扩展。
2. 对组织相关高频查询持续做索引评估。
