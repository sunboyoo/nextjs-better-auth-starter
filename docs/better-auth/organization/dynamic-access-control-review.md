# Better Auth Organization Dynamic Access Control 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/organization/dynamic-access-control.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：⚠️ 部分合规。
- `dynamicAccessControl.enabled` 已开启，但角色管理主链路主要走自定义 API + DB CRUD。

## 2. 已实现能力

1. 服务端与客户端均启用 `dynamicAccessControl`。
2. 组织角色数据表 `organization_role` 已定义。
3. 管理后台可对组织角色做增删改查。
4. 新建角色重名检查已修正为 `(organizationId, role)` 作用域。

## 3. 主要差距与风险

1. 角色 CRUD 主要在 `src/app/api/admin/organizations/[organizationId]/roles/**` 直接操作 DB。
2. `organization_role` 表当前缺少 `(organizationId, role)` 唯一约束，仍可能存在并发写入重复数据风险。
3. 与官方动态权限 API 行为可能存在长期语义偏差。

## 4. 代码证据

- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/app/api/admin/organizations/[organizationId]/roles/route.ts`
- `src/app/api/admin/organizations/[organizationId]/roles/[roleId]/route.ts`
- `src/db/schema.ts`

## 5. 建议

1. 在 `src/db/schema.ts` 为 `organization_role` 增加 `(organizationId, role)` 唯一约束，补齐数据库层兜底。
2. 为角色管理补充契约测试，确保权限语义稳定。
3. 评估将部分角色操作收敛到官方 API 语义层。
