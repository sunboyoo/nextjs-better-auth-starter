# Better Auth Admin Installation 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/admin/installation.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 完整合规。
- Admin 插件已在服务端启用，admin 客户端插件已隔离到独立模块，后台路由也具备服务端鉴权。

## 2. 安装核对

1. 服务端已启用 `admin()` 插件。
2. 客户端 admin 插件仅在 `src/lib/auth-admin-client.ts` 启用。
3. `src/lib/auth-client.ts` 未包含 `adminClient()`。
4. 管理接口位于 `/api/admin/**`，全部需通过 `requireAdmin()`。

## 3. 数据与运行时前提

1. `user.role`、`user.banned` 等 admin 相关字段已在 schema 定义。
2. 会话模型包含 `impersonatedBy` 字段，支持后续扩展 impersonation 能力。
3. 管理端调用路径以服务端 API 为主，避免浏览器直接持有高权限能力。

## 4. 代码证据

- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/lib/auth-admin-client.ts`
- `src/lib/api/auth-guard.ts`
- `src/db/schema.ts`
- `src/app/api/admin/**`

## 5. 建议

1. 增加“首次管理员引导”文档（如何安全授予首个 admin）。
2. 对关键 admin API 增加 smoke test，防止权限守卫回归。
