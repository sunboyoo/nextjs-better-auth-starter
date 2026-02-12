# Better Auth Concepts Users & Accounts 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/concepts/users-accounts.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 完整合规。
- 用户端账户管理能力（改邮箱、改密、设密、删号、社交账号链接/解绑）均已落地。

## 2. 已实现能力

1. `accountLinking.enabled` 已开启并设置 trusted providers。
2. `user.changeEmail.enabled` 已开启，且要求确认流程。
3. `user.deleteUser.enabled` 已开启，带删除确认邮件。
4. 用户页面支持 `changePassword`、`setPassword`、`deleteUser`。
5. 用户页面支持 `listAccounts`、`linkSocial`、`unlinkAccount`。

## 3. 风险与差距

1. 高风险账户动作审计仍可增强（删号、改邮箱）。
2. 关键账户流程自动化回归测试仍需补全。

## 4. 代码证据

- `src/lib/auth.ts`
- `src/app/dashboard/user-account/_components/user-email-card.tsx`
- `src/app/dashboard/user-account/_components/user-password-card.tsx`
- `src/app/dashboard/user-account/_components/delete-user-card.tsx`
- `src/app/dashboard/user-account/_components/user-oauth-card.tsx`

## 5. 建议

1. 为账户管理关键流程补充 E2E 与安全回归测试。
2. 增加统一审计日志事件模型，提升可追踪性。
