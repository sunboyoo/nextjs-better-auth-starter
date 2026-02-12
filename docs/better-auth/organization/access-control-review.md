# Better Auth Organization Access Control 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/organization/access-control.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：⚠️ 部分合规（混合架构）。
- Organization 插件已接入 `ac`，但业务权限同时依赖自定义 RBAC API 与多表模型。

## 2. 已实现能力

1. `organization({ ac })` 已配置，内置角色权限可用。
2. 客户端可使用 `organizationClient({ ac, dynamicAccessControl })`。
3. 存在 `/api/rbac/permissions/check` 进行自定义权限判定。

## 3. 主要差距与风险

1. 权限体系分叉：官方 `hasPermission` 语义与自定义 `/api/rbac/*` 并行。
2. 自定义权限检查为多表联查，复杂度高、维护成本高。
3. 跨体系一致性（角色/动作定义）需要长期治理。

## 4. 代码证据

- `src/lib/built-in-organization-role-permissions.ts`
- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/app/api/rbac/permissions/check/route.ts`
- `src/db/schema.ts`（RBAC 扩展表）

## 5. 建议

1. 明确“官方权限”与“业务扩展权限”边界文档。
2. 优先收敛鉴权入口，减少多套权限判断分散调用。
3. 为自定义权限链路增加性能与一致性回归测试。
