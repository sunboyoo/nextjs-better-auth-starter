# Better Auth Concepts API 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/concepts/api.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 合规。
- 服务端 API 调用以 `auth.api.*` 为主，用户态与管理态边界总体清晰。

## 2. 已实现能力

1. 会话获取统一使用 `auth.api.getSession`。
2. 用户管理、会话撤销、组织邀请等均有 `auth.api.*` 实现。
3. 用户账户页服务端通过 `auth.api.listUserAccounts/listPasskeys/listSessions` 取数。

## 3. 风险与差距

1. 部分能力通过 `auth.api as unknown as {...}` 进行方法扩展，存在类型漂移风险。
2. 全站会话列表使用 SQL 聚合（为跨用户管理场景），与官方单用户 API 路径并行。

## 4. 代码证据

- `src/lib/api/auth-guard.ts`
- `src/app/api/admin/users/**`
- `src/app/api/admin/sessions/**`
- `src/app/api/admin/organizations/**`
- `src/app/dashboard/user-account/page.tsx`

## 5. 建议

1. 收敛 `as unknown as` 包装，增加统一 API 类型层。
2. 为关键 `auth.api.*` 路径增加契约测试，降低升级风险。
