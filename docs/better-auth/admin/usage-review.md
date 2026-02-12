# Better Auth Admin Usage 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/admin/usage.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：⚠️ 部分合规。
- 用户管理主流程已覆盖 Better Auth admin API；剩余差距主要在会话全局聚合与 impersonation 能力。

## 2. 已实现能力

1. 用户：创建、列表、改角色、封禁/解封、删除、更新资料。
2. 会话：撤销单会话、撤销用户全部会话。
3. 邮箱流程：发送验证邮件、触发邮箱变更验证。
4. 设密：管理端改密已通过 `auth.api.setUserPassword` 处理。
5. 组织与 RBAC 扩展：具备完整 admin 侧接口。

## 3. 主要差距与风险

1. 全局会话列表通过 SQL 聚合（`src/utils/sessions.ts`），与单用户会话 API 路径不同。
2. impersonation 尚未落地（仅有 `impersonatedBy` 字段展示）。

## 4. 代码证据

- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[userId]/route.ts`
- `src/app/api/admin/users/set-password/route.ts`
- `src/app/api/admin/sessions/route.ts`
- `src/app/api/admin/sessions/[token]/route.ts`
- `src/app/api/admin/users/[userId]/sessions/route.ts`
- `src/utils/users.ts`
- `src/utils/sessions.ts`

## 5. 建议

1. 为 `setUserPassword` 增加契约回归测试（合法/非法密码、用户不存在、权限不足）。
2. 为全局会话查询补充边界测试（分页、过滤、过期会话）。
3. 补齐 impersonation 全流程（发起/停止/审计/前端提示）。
