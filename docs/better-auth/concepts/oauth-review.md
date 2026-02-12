# Better Auth Concepts OAuth 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/concepts/oauth.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 合规（条件启用 provider，且已补齐配置可观测性）。
- OAuth 社交登录、OAuth Provider、同意页、账号/组织选择流程均已接入并可运行。

## 2. 已实现能力

1. 多社交 provider 条件注册（GitHub/Google/Facebook/Discord/Microsoft/Twitch/Twitter/PayPal/Vercel）。
2. 客户端社交登录统一使用 `authClient.signIn.social`。
3. 已启用 `oauthProvider` 插件，含 consent、select-account、select-organization 流程。
4. 已在服务端增加 provider 环境矩阵校验与告警：
   - 检测 `clientId/clientSecret` 配对缺失。
   - 对生产环境非 HTTPS `baseUrl` 给出告警。

## 3. 风险与差距

1. provider 是否真正可用仍取决于部署环境变量的真实值（本轮已通过启动告警降低排障成本）。
2. Google One Tap 与 Google Social Sign-In 的环境要求不同（One Tap 可仅 `clientId`，Social 仍需 `GOOGLE_CLIENT_SECRET`）。

## 4. 代码证据

- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/app/auth/oauth/**`
- `src/app/auth/sign-in/_components/social-sign-in-buttons.tsx`

## 5. 建议

1. 在 CI/CD 增加 env 校验脚本，发布前阻断 provider 配置缺失。
2. 增加 OAuth 回调失败与 `state` 失配场景回归测试。
