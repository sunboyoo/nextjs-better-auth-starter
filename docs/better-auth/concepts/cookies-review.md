# Better Auth Concepts Cookies 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/concepts/cookies.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 合规。
- Cookie 与会话缓存配置完整，生产环境安全 cookie 策略已启用。

## 2. 已实现能力

1. 启用 `nextCookies()` 插件。
2. `session.cookieCache` 已启用（`strategy: "compact"`，5 分钟）。
3. `advanced.useSecureCookies` 在生产环境启用。
4. `trustedOrigins` 支持环境变量注入。

## 3. 风险与差距

1. 多域场景（cross-subdomain）当前未启用，如未来需要需专项设计。
2. cookieCache 命中策略与会话一致性需结合业务压测验证。

## 4. 代码证据

- `src/lib/auth.ts`

## 5. 建议

1. 增加生产环境 cookie 安全配置自检脚本。
2. 记录 cookie 相关变更的回归检查清单。
