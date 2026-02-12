# Better Auth Concepts Plugins 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/concepts/plugins.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 合规（插件覆盖广）。
- 当前项目插件体系完整，覆盖认证、组织、管理、会话、安全、开放接口等场景。

## 2. 主要插件

1. `admin`、`organization`、`twoFactor`、`emailOTP`、`phoneNumber`、`magicLink`、`passkey`
2. `multiSession`、`jwt`、`bearer`、`username`、`lastLoginMethod`
3. `haveIBeenPwned`、`captcha`、`nextCookies`、`openAPI`
4. `oauthProvider`、`oAuthProxy`、`deviceAuthorization`、`oneTap`
5. 条件启用：`stripe`、`sso`、`scim`

## 3. 风险与差距

1. 插件数量多，升级时需要更严格回归。
2. 某些插件为条件启用，运行时行为受环境变量影响明显。

## 4. 代码证据

- `src/lib/auth.ts`
- `src/lib/auth-client.ts`

## 5. 建议

1. 建立“插件-功能-负责人-回归用例”映射表。
2. 将关键插件行为加入发布前 smoke 测试。
