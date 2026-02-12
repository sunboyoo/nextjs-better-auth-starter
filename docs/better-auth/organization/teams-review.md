# Better Auth Organization Teams 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/organization/teams.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：⚪ 不适用（功能未启用）。
- 当前项目未启用 Teams，属于合理范围内的产品取舍。

## 2. 核对结果

1. 服务端 `organization` 配置未启用 `teams`。
2. 客户端 `organizationClient` 未启用 `teams`。
3. schema 无 `team`/`teamMember` 表。
4. session 无 `activeTeamId` 字段。

## 3. 启用前置清单

1. 服务端启用 teams 选项。
2. 客户端启用 teams 插件能力。
3. 增加 `team`、`teamMember`、`session.activeTeamId`（及必要 invitation 扩展）。
4. 补充团队权限与邀请流程测试。

## 4. 代码证据

- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/db/schema.ts`

## 5. 建议

1. 在产品需求明确前保持未启用状态，避免额外复杂度。
2. 若启用，先做 schema 与权限设计评审再落地。
