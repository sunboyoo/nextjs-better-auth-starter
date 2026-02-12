# Better Auth Concepts Client 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/concepts/client.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 合规。
- 客户端已通过 `createAuthClient` 统一接入多插件，且 admin 客户端隔离明确。

## 2. 已实现能力

1. `authClient` 集成 organization/twoFactor/multiSession/passkey/emailOTP/phoneNumber/magicLink 等插件。
2. `authAdminClient` 单独文件维护，仅挂载 `adminClient()`。
3. 客户端对 429 统一 toast 提示。

## 3. 风险与差距

1. 插件众多，建议定期复核不再使用的插件，减少复杂度。
2. 某些历史路径仍并存（如 version1 页面），建议逐步收敛。

## 4. 代码证据

- `src/lib/auth-client.ts`
- `src/lib/auth-admin-client.ts`
- `src/app/auth/sign-in/**`

## 5. 建议

1. 建立插件清单与启用条件文档，避免配置漂移。
2. 在 CI 增加“auth-client 不含 adminClient”静态检查。
