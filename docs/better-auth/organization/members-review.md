# Better Auth Organization Members 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/organization/members.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 合规（混合实现）。
- 用户侧通过官方 organization client 管理成员，管理侧通过 `/api/admin/organizations/*/members` 封装官方成员 API 并补充平台运维能力。

## 2. 已实现能力

1. 用户侧：`removeMember` 与邀请成员流程已实现。
2. 管理侧：成员列表、新增成员、移除成员、修改成员角色。
3. 组织成员关系具备唯一约束，避免重复成员。

## 3. 主要差距与风险

1. 用户侧与管理侧走不同实现路径，需长期保持行为一致。
2. 管理侧成员列表会额外补齐用户资料字段（名称/头像/平台角色），需持续保证字段映射一致性。

## 4. 代码证据

- `src/data/organization/member-remove-mutation.ts`
- `src/app/api/admin/organizations/[organizationId]/members/route.ts`
- `src/app/api/admin/organizations/[organizationId]/members/[memberId]/route.ts`
- `src/lib/auth-api.ts`
- `src/db/schema.ts`

## 5. 建议

1. 统一成员管理行为文档（用户侧 vs 管理侧）。
2. 为成员增删改补充鉴权与边界测试（尤其跨组织场景）。
