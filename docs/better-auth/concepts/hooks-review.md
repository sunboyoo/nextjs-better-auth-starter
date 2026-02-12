# Better Auth Concepts Hooks 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/concepts/hooks.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 已启用并在关键路径使用。
- 当前使用 `hooks.before + hooks.after + createAuthMiddleware` 实施认证主流程保护与审计补全。

## 2. 已实现能力

1. 登录主方式与 profile 的服务端强校验。
2. MFA 因子可用性检查。
3. callback 放行策略检查。
4. 邀请邮箱与 synthetic email 防护。
5. Phone OTP 自定义节流检查。
6. `hooks.after` 已覆盖高风险账户动作审计事件写入（改邮箱、改密、设密、删号、会话撤销、解绑）。

## 3. 差距与建议

1. 建议将 `before` 中复杂分支进一步拆分并补单测。
2. 建议为 `hooks.after` 的路径映射增加契约测试，防止升级后路径变更导致审计漏报。

## 4. 代码证据

- `src/lib/auth.ts`
- `src/config/authentication/enforcement.ts`
- `src/lib/api/user-security-audit.ts`
