# Better Auth Concepts Hooks 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/concepts/hooks.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 已启用并在关键路径使用。
- 当前使用 `hooks.before + createAuthMiddleware` 实施认证主流程保护。

## 2. 已实现能力

1. 登录主方式与 profile 的服务端强校验。
2. MFA 因子可用性检查。
3. callback 放行策略检查。
4. 邀请邮箱与 synthetic email 防护。
5. Phone OTP 自定义节流检查。

## 3. 差距与建议

1. `hooks.after` 尚未启用，可用于审计事件写入。
2. 建议将 `before` 中复杂分支进一步拆分并补单测。

## 4. 代码证据

- `src/lib/auth.ts`
- `src/config/authentication/enforcement.ts`
