# Better Auth 插件实现现状（代码审计版）

- 审计日期: 2026-02-12
- 审计范围: `src/lib/auth.ts`、`src/lib/auth-client.ts`、`src/lib/auth-admin-client.ts`、`src/app/api/mcp/route.ts`
- 目标: 给出基于当前代码的真实插件状态（已接入/条件启用/未接入），并修正历史误判

## 图例
- ⭐⭐⭐⭐⭐: 强烈推荐（大多数 SaaS 都建议）
- ⭐⭐⭐⭐: 推荐（明显提升安全/体验）
- ⭐⭐⭐: 按需
- ⭐⭐: 特定场景
- ⭐: 当前阶段通常不需要
- ✅: 已接入并在代码中可见
- ⚙️: 已接入，但由环境变量控制或仅在特定条件生效
- ❌: 未接入

## 快速结论
1. 项目已接入的官方插件覆盖面很高：认证、组织、多会话、2FA、Passkey、OAuth Provider、JWT、OpenAPI、设备授权、支付等均已接入。
2. 之前文档里“手机号登录未实现”“Email OTP 仅部分实现”“Anonymous 已实现”“OIDC/OAuth Provider 未实现”“MCP 未实现”等结论与当前代码不一致，已修正。
3. 一些高级能力为“代码已接入 + 条件启用”，例如 `captcha`、`stripe`、`sso`、`scim`。

## 认证类插件（Authentication）

| 插件/能力 | 推荐 | 当前状态 | 代码证据 | 说明 |
|---|---:|---|---|---|
| Two Factor | ⭐⭐⭐⭐⭐ | ✅ | `src/lib/auth.ts`、`src/lib/auth-client.ts` | 已接入并在登录/账户页面使用，支持 `totp`、`emailOtp`、`backupCode` 验证流程。 |
| Username | ⭐⭐⭐⭐ | ✅ | `src/lib/auth.ts`、`src/lib/auth-client.ts` | 已接入用户名登录能力。 |
| Phone Number | ⭐⭐⭐⭐ | ✅ | `src/lib/auth.ts`、`src/lib/auth-client.ts`、`src/components/forms/sign-in-form.tsx` | 已实现手机号 OTP 登录与找回流程，不是“未实现”。 |
| Email OTP | ⭐⭐⭐⭐ | ✅ | `src/lib/auth.ts`、`src/lib/auth-client.ts`、`src/components/forms/sign-in-form.tsx` | 已用于登录/验证/重置场景，不是“仅部分实现”。 |
| Magic Link | ⭐⭐⭐⭐ | ✅ | `src/lib/auth.ts`、`src/lib/auth-client.ts` | 已接入并用于无密码登录。 |
| Passkey | ⭐⭐⭐⭐⭐ | ✅ | `src/lib/auth.ts`、`src/lib/auth-client.ts`、`src/app/auth/sign-in/_components/sign-in-biometric-step.tsx` | 已支持专用生物识别步骤与回退。 |
| One Tap | ⭐⭐⭐⭐ | ✅ | `src/lib/auth.ts`、`src/lib/auth-client.ts`、`src/app/auth/sign-in/_components/sign-in-page-client.tsx` | 已接入；受 Google Client ID 与 profile 社交展示策略共同控制。 |
| Anonymous | ⭐⭐ | ❌ | 代码未见 `anonymous` 插件 | 之前标记为“已实现”不准确。 |
| Generic OAuth | ⭐⭐ | ❌ | 代码未见 `genericOAuth` 插件 | 当前主要使用内置社交提供方。 |
| SIWE (Sign In With Ethereum) | ⭐ | ❌ | 代码未见 `siwe` 插件 | 当前项目非 Web3 导向。 |

## 授权与管理（Authorization & Management）

| 插件/能力 | 推荐 | 当前状态 | 代码证据 | 说明 |
|---|---:|---|---|---|
| Admin | ⭐⭐⭐⭐⭐ | ✅ | `src/lib/auth.ts`、`src/lib/auth-admin-client.ts` | 服务端与独立 admin client 均已接入。 |
| Organization | ⭐⭐⭐⭐⭐ | ✅ | `src/lib/auth.ts`、`src/lib/auth-client.ts` | 已启用动态权限控制、邀请流程等。 |
| API Key | ⭐⭐⭐ | ❌ | 代码未见 `apiKey` 插件 | 若要开放开发者平台再考虑。 |
| OAuth Provider | ⭐⭐⭐⭐ | ✅ | `src/lib/auth.ts`、`src/lib/auth-client.ts` | 已作为身份提供方接入，包含 scope/audience/consent/select-account 流程。 |
| MCP 能力（基于 OAuth Provider） | ⭐⭐⭐ | ✅ | `src/app/api/mcp/route.ts`、`src/lib/auth.ts` | 通过 `@better-auth/oauth-provider` 的 `mcpHandler` 实现，不是独立 `mcp` 插件模式。 |

## 企业与基础设施（Enterprise / Platform）

| 插件/能力 | 推荐 | 当前状态 | 代码证据 | 说明 |
|---|---:|---|---|---|
| SSO | ⭐⭐⭐ | ⚙️ | `src/lib/auth.ts` | 已接入，`BETTER_AUTH_ENABLE_SSO !== \"false\"` 时启用。 |
| SCIM | ⭐⭐ | ⚙️ | `src/lib/auth.ts` | 已接入，`BETTER_AUTH_ENABLE_SCIM !== \"false\"` 时启用。 |
| JWT | ⭐⭐⭐⭐ | ✅ | `src/lib/auth.ts` | 已启用 JWT issuer 配置。 |
| OpenAPI | ⭐⭐⭐ | ✅ | `src/lib/auth.ts` | 已启用 OpenAPI 插件。 |
| OAuth Proxy | ⭐⭐⭐ | ✅ | `src/lib/auth.ts` | 已启用 `oAuthProxy`。 |

## 工具与会话（Utility / Session）

| 插件/能力 | 推荐 | 当前状态 | 代码证据 | 说明 |
|---|---:|---|---|---|
| Bearer | ⭐⭐⭐ | ✅ | `src/lib/auth.ts` | 适合移动端/CLI token 场景。 |
| Multi Session | ⭐⭐⭐ | ✅ | `src/lib/auth.ts`、`src/lib/auth-client.ts` | 已支持多会话能力。 |
| Device Authorization | ⭐⭐ | ✅ | `src/lib/auth.ts`、`src/lib/auth-client.ts` | 已接入设备码授权。 |
| Captcha | ⭐⭐⭐⭐ | ⚙️ | `src/lib/auth.ts` | 已接入但依赖 `BETTER_AUTH_CAPTCHA_ENABLED` 和密钥配置。 |
| Last Login Method | ⭐⭐⭐ | ✅ | `src/lib/auth.ts`、`src/lib/auth-client.ts` | 仅用于登录方式追踪，不等于 Have I Been Pwned。 |
| Have I Been Pwned | ⭐⭐⭐ | ✅ | `src/lib/auth.ts` | 已接入密码泄露检查插件，覆盖注册/改密/重置/设置密码路径。 |
| nextCookies | ⭐⭐ | ✅ | `src/lib/auth.ts` | Next.js App Router cookie 集成（框架适配器）。 |
| Custom Session | ⭐⭐⭐ | ✅ | `src/lib/auth.ts`、`src/lib/auth-client.ts` | 扩展 session 返回 `emailSource`、`emailDeliverable` 字段；配置 `shouldMutateListDeviceSessionsEndpoint: true`。 |
| Electron | ⭐⭐ | ✅ | `src/lib/better-auth-electron/server.ts`、`src/lib/auth-client.ts` | **自建插件**（非官方 `better-auth/plugins`），位于 `src/lib/better-auth-electron/`，提供 Electron 代理认证支持。 |

## 支付（Payments）

| 插件/能力 | 推荐 | 当前状态 | 代码证据 | 说明 |
|---|---:|---|---|---|
| Stripe | ⭐⭐⭐⭐ | ⚙️ | `src/lib/auth.ts`、`src/lib/auth-client.ts` | 代码已接入；需 `STRIPE_KEY`、`STRIPE_WEBHOOK_SECRET` 且未显式关闭才启用。 |

## 社交登录 Provider（非插件，环境变量条件启用）

| Provider | 状态 | 启用条件 |
|---|---|---|
| GitHub | ⚙️ | `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` 均设置 |
| Google | ⚙️ | `GOOGLE_CLIENT_ID`（或 `NEXT_PUBLIC_GOOGLE_CLIENT_ID`）+ `GOOGLE_CLIENT_SECRET` |
| Facebook | ⚙️ | `FACEBOOK_CLIENT_ID` + `FACEBOOK_CLIENT_SECRET` |
| Discord | ⚙️ | `DISCORD_CLIENT_ID` + `DISCORD_CLIENT_SECRET` |
| Microsoft | ⚙️ | `MICROSOFT_CLIENT_ID` + `MICROSOFT_CLIENT_SECRET`，可选 `MICROSOFT_TENANT_ID` |
| Twitch | ⚙️ | `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` |
| Twitter | ⚙️ | `TWITTER_CLIENT_ID` + `TWITTER_CLIENT_SECRET` |
| PayPal | ⚙️ | `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` |
| Vercel | ⚙️ | `VERCEL_CLIENT_ID` + `VERCEL_CLIENT_SECRET` |

> 社交 Provider 不是 Better Auth 插件，而是 `betterAuth({ socialProviders: {...} })` 的内置能力。每个 Provider 仅在对应 Client ID 和 Client Secret 环境变量都配置后才注入。

## 与旧版文档相比的关键修正
1. `Phone Number` 从“未实现”修正为“已实现”。
2. `Email OTP` 从“部分实现”修正为“已实现（含登录）”。
3. `Anonymous` 从“已实现”修正为“未实现”。
4. `Have I Been Pwned` 已确认为“已实现”，且与 `lastLoginMethod` 插件职责明确区分（两者不等价）。
5. `OAuth Provider` 从“未实现”修正为“已实现”。
6. `MCP` 从“未实现”修正为“已实现（基于 OAuth Provider + mcpHandler 路由）”。

## 建议优先级（下一步）
1. 明确生产环境是否真的需要默认启用 `sso`/`scim`，若暂不需要可在环境变量中显式关闭。
2. 已接入 Have I Been Pwned；建议在前端错误提示中保持“可操作但不泄露细节”的文案一致性。
3. 若规划开放平台能力，再引入 `apiKey` 插件并配套配额/审计策略。
