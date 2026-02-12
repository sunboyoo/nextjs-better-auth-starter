# Better Auth Database Drizzle 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/database/drizzle.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 合规。
- 服务端使用 `drizzleAdapter` 对接 Better Auth，schema 覆盖广且与业务扩展一致。

## 2. 已实现能力

1. `database: drizzleAdapter(db, { provider: "pg", schema: {...} })` 已配置。
2. `db` 通过 Drizzle + Postgres 初始化。
3. Better Auth 核心表与插件扩展表在 `src/db/schema.ts` 统一管理。

## 3. 风险与差距

1. schema 体量较大，建议保持插件升级后的迁移检查流程。
2. 自定义 RBAC 表较多，需持续评估与 Better Auth 内置能力的边界。

## 4. 代码证据

- `src/lib/auth.ts`
- `src/db/index.ts`
- `src/db/schema.ts`

## 5. 建议

1. 形成“插件变更 -> schema 检查 -> 回归测试”固定流程。
2. 对关键表迁移增加自动化校验脚本。
