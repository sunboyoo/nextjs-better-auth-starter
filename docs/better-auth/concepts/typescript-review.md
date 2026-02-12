# Better Auth Concepts TypeScript 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/concepts/typescript.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：⚠️ 部分合规。
- 核心类型推断已使用（`auth.$Infer`、`customSessionClient<typeof auth>()`），但 admin 路由中仍存在较多 `as unknown as`。

## 2. 已实现能力

1. 导出 `Session`、`ActiveOrganization` 等推断类型。
2. 客户端 `customSessionClient<typeof auth>()` 与服务端类型联动。
3. 大部分入参通过 Zod 校验形成类型边界。

## 3. 主要差距与风险

1. `auth.api` 扩展调用经常使用 `as unknown as`，升级时容易发生静态类型失配。
2. 某些跨层 DTO 仍依赖手写接口，未完全复用推断类型。

## 4. 代码证据

- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/app/api/admin/**`

## 5. 建议

1. 建立 `auth-api-types.ts` 统一封装常用 `auth.api` 方法类型。
2. 逐步替换分散的 `as unknown as`。
