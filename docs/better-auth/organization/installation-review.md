# Better Auth Organization Installation 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/organization/installation.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 完整合规。
- Organization 插件已在服务端与客户端正确安装并联通。

## 2. 安装核对

1. 服务端：`organization(...)` 已配置。
2. 客户端：`organizationClient(...)` 已配置。
3. 组织核心表（organization/member/invitation）与扩展角色表已存在。
4. 邀请邮件回调与过期策略已配置。

## 3. 代码证据

- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/db/schema.ts`
- `src/app/auth/accept-invitation/[id]/page.tsx`

## 4. 建议

1. 为安装层能力新增 smoke test（创建组织、邀请、接受邀请）。
2. 在运维文档里明确组织功能依赖的环境变量。
