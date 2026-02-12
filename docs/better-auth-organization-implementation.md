# Better Auth Organization 实现审计（当前代码基准）

- 审计日期：2026-02-12
- 审计范围：
  - `src/lib/auth.ts`
  - `src/lib/auth-client.ts`
  - `src/lib/auth-api.ts`
  - `src/db/schema.ts`
  - `src/app/api/admin/organizations/**`
  - `src/app/admin/_components/organizations/**`

## 1. 核心配置与架构

| 功能点 | 状态 | 说明 |
|---|---|---|
| Organization 插件启用 | ✅ 已实现 | `src/lib/auth.ts` 已启用 `organization({...})`。 |
| 动态权限控制 | ✅ 已实现 | `dynamicAccessControl.enabled = true`。 |
| 邀请邮件发送 | ✅ 已实现 | `sendInvitationEmail` 已配置，入口为 `/auth/accept-invitation/[id]`。 |
| 邀请有效期配置 | ✅ 已实现 | 使用 `ORGANIZATION_INVITATION_EXPIRES_IN_DAYS`。 |
| 邀请需邮箱验证 | ✅ 已实现 | `requireEmailVerificationOnInvitation: true`。 |
| 客户端 Organization 能力 | ✅ 已实现 | `organizationClient` 已启用。 |

## 2. 数据模型（Schema）

| 表/结构 | 状态 | 说明 |
|---|---|---|
| `organization` | ✅ 已实现 | 组织主表（name/slug/logo/metadata 等）。 |
| `member` | ✅ 已实现 | 成员关系，含 `(organizationId, userId)` 唯一约束。 |
| `invitation` | ✅ 已实现 | 邀请记录（email/role/status/expiresAt/inviterId）。 |
| `organizationRole` | ✅ 已实现 | 动态组织角色表。 |
| 组织角色唯一性 | ✅ 已实现 | 新增 `(organizationId, role)` 唯一索引。 |
| `team` / `teamMember` | ❌ 未启用 | 当前仍是“组织-成员”单层模型。 |

## 3. 管理后台 API 实现现状

| 功能点 | 状态 | 说明 |
|---|---|---|
| 组织列表/详情 | ✅ 已实现 | 使用 Better Auth Organization API 为主，保留本地聚合字段（计数/分页）。 |
| 组织创建/更新/删除 | ✅ 已实现 | 已迁移到官方 API，并补齐 slug 冲突检查。 |
| slug 预检查 | ✅ 已实现 | 新增 `/api/admin/organizations/check-slug`，前端创建/编辑弹窗接入。 |
| 成员列表/添加/移除/改角色 | ✅ 已实现 | 已迁移到官方 `listMembers/addMember/removeMember/updateMemberRole`。 |
| 角色列表/创建/更新/删除 | ✅ 已实现 | 已迁移到官方 `listOrgRoles/createOrgRole/updateOrgRole/deleteOrgRole`。 |
| 邀请列表/发送/重发/取消 | ✅ 已实现 | 已迁移到官方 `listInvitations/createInvitation/cancelInvitation`。 |
| 管理动作审计 | ✅ 已实现 | 组织相关关键动作已写入 `admin_audit_log`。 |

## 4. 邀请与成员体验

1. 邀请流（发送、重发、取消、接受、拒绝）全链路可用。
2. 管理员对邀请操作仍受组织成员身份约束（符合插件语义）。
3. 邀请列表支持服务端过滤与分页。

## 5. 与官方语义一致性

当前实现是“官方 API 优先 + 本地读模型补充”的模式：
1. 变更类操作尽量走 Better Auth 官方 Organization API。
2. 只在管理端列表展示中补充本地统计字段（成员数/角色数等）。
3. 已去除“全局角色名冲突”风险，改为组织内作用域唯一。

## 6. 已知边界

1. Teams 能力尚未启用（业务未要求）。
2. 若后续启用 Teams，需要同步扩展 schema、管理端 API 和权限模型。
