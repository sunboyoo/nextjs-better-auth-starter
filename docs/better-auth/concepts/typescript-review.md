# Better Auth Concepts TypeScript 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/concepts/typescript.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 主要合规。
- 核心类型推断已使用（`auth.$Infer`、`customSessionClient<typeof auth>()`）；`auth.api` 扩展已收敛到单点类型封装。

## 2. 已实现能力

1. 导出 `Session`、`ActiveOrganization` 等推断类型。
2. 客户端 `customSessionClient<typeof auth>()` 与服务端类型联动。
3. 大部分入参通过 Zod 校验形成类型边界。
4. `auth.api` 扩展统一在 `src/lib/auth-api.ts` 管理，避免路由层分散类型断言。

## 3. 主要差距与风险

1. `auth.api as unknown as ExtendedAuthApi` 仍是单点断言，Better Auth 升级后仍需重点回归扩展方法签名。
2. 某些跨层 DTO 仍依赖手写接口，未完全复用推断类型。

## 4. 代码证据

- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/lib/auth-api.ts`
- `src/app/api/admin/**`

## 5. 建议

1. 为 `ExtendedAuthApi` 增加契约测试，覆盖关键方法入参与返回值形状。
2. 随 Better Auth 版本升级同步收敛手写 DTO，优先复用官方推断类型。
