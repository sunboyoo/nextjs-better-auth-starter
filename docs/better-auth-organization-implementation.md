# Better Auth Organization 实现审计（当前代码基准）

- 审计日期：2026-02-11
- 审计范围：
  - `src/lib/auth.ts`
  - `src/lib/auth-client.ts`
  - `src/db/schema.ts`
  - `src/app/dashboard/_components/dashboard-home/active-organization-card.tsx`
  - `src/app/dashboard/_components/dashboard-home/user-invitations-card.tsx`
  - `src/app/auth/accept-invitation/[id]/page.tsx`
  - `src/app/api/admin/organizations/**`
  - `src/app/admin/_components/organizations/**`
  - `src/data/better-auth-official/organization/**`

## 1. 核心配置与架构

| 功能点 | 状态 | 说明 |
|---|---|---|
| Organization 插件启用 | ✅ 已实现 | `src/lib/auth.ts` 已启用 `organization({...})`。 |
| 动态权限控制 | ✅ 已实现 | `dynamicAccessControl.enabled = true`。 |
| 邀请邮件发送 | ✅ 已实现 | 配置了 `sendInvitationEmail`，邀请链接为 `/auth/accept-invitation/[id]`。 |
| 邀请有效期配置 | ✅ 已实现 | 使用 `ORGANIZATION_INVITATION_EXPIRES_IN_DAYS`。 |
| 邀请需邮箱验证 | ✅ 已实现 | `requireEmailVerificationOnInvitation: true`。 |
| Session 活跃组织支持 | ✅ 已实现 | `session.activeOrganizationId` 已在 schema 中定义。 |
| 客户端 Organization 能力 | ✅ 已实现 | `src/lib/auth-client.ts` 启用 `organizationClient`。 |

## 2. 数据模型（Schema）

| 表/结构 | 状态 | 说明 |
|---|---|---|
| `organization` | ✅ 已实现 | 组织主表（name/slug/logo/metadata 等）。 |
| `member` | ✅ 已实现 | 成员关系，含 `(organizationId, userId)` 唯一约束。 |
| `invitation` | ✅ 已实现 | 邀请记录（email/role/status/expiresAt/inviterId）。 |
| `organizationRole` | ✅ 已实现 | 组织级动态角色与权限 JSON。 |
| `team` / `teamMember` | ❌ 未实现 | 当前 schema 不含 Teams 相关表。 |

## 3. 组织管理能力

| 功能点 | 状态 | 说明 |
|---|---|---|
| 创建组织（普通用户） | ✅ 已实现 | `CreateOrganizationForm` 通过 `authClient.organization.create` 创建。 |
| 组织列表与切换（Dashboard） | ✅ 已实现 | `useListOrganizations` + `organization.setActive`。 |
| Active Organization UI | ✅ 已实现 | `ActiveOrganizationCard` 提供激活提示、组织切换与邀请入口。 |
| 管理后台组织 CRUD | ✅ 已实现 | `/api/admin/organizations` 与 `/api/admin/organizations/[organizationId]`。 |

## 4. 成员管理能力

| 功能点 | 状态 | 说明 |
|---|---|---|
| 成员列表 | ✅ 已实现 | `/api/admin/organizations/[organizationId]/members` + `MembersTable`。 |
| 添加成员（直接加入） | ✅ 已实现 | `MemberAddDialog` 通过用户搜索直接写入成员关系。 |
| 移除成员 | ✅ 已实现 | `DELETE /api/admin/organizations/[organizationId]/members/[memberId]`。 |
| 修改成员角色 | ✅ 已实现 | `PATCH /api/admin/organizations/[organizationId]/members/[memberId]`。 |

## 5. 邀请系统能力

| 功能点 | 状态 | 说明 |
|---|---|---|
| 邀请外部邮箱 | ✅ 已实现 | 管理后台“Invite by Email”调用 `/api/admin/organizations/[organizationId]/invitations`。 |
| 邀请已有用户 | ✅ 已实现 | 管理后台“Invite Existing User”也走邀请流（不是直接加成员）。 |
| Dashboard 发邀入口 | ✅ 已实现 | `ActiveOrganizationCard` 可直接 `authClient.organization.inviteMember`。 |
| 邀请列表管理 | ✅ 已实现 | `OrganizationMemberInvitationsTable` 支持分页、搜索、状态过滤。 |
| 取消邀请 | ✅ 已实现 | `DELETE /api/admin/organizations/[organizationId]/invitations/[invitationId]`。 |
| 重发邀请 | ✅ 已实现 | `POST /api/admin/organizations/[organizationId]/invitations` + `resend: true`。 |
| 接受邀请 | ✅ 已实现 | 支持 `/auth/accept-invitation/[id]` 页面，也支持 Dashboard `UserInvitationsCard` 直接 accept。 |
| 拒绝邀请 | ✅ 已实现 | 支持邀请详情页与 Dashboard `UserInvitationsCard` 的 reject 流程。 |

补充说明：
1. 管理后台邀请接口要求“当前管理员必须是目标组织成员”，否则返回 `NOT_ORG_MEMBER`。
2. 邀请列表基于 Better Auth `listInvitations` 获取后，在服务端再做搜索/状态过滤与分页。

## 6. 角色与权限（RBAC）

| 功能点 | 状态 | 说明 |
|---|---|---|
| 内置角色 | ✅ 已实现 | `owner`、`admin`、`member`。 |
| 动态自定义角色 | ✅ 已实现 | 支持组织角色增删改查与权限树编辑。 |
| 组织应用角色分配 | ✅ 已实现 | 后台支持按 Organization/App 对成员分配细粒度角色。 |

## 7. Teams 能力

| 功能点 | 状态 | 说明 |
|---|---|---|
| Teams 插件开关 | ❌ 未启用 | `organization({...})` 未开启 `teams`。 |
| Teams 数据模型 | ❌ 未实现 | schema 无 `team` / `teamMember`。 |

结论：
当前是“组织-成员”单层模型，不包含组织内 Team 分组。

## 8. 实现方式说明（重要）
当前 Organization 能力是“混合实现”模式：
1. Better Auth 官方 Organization API（`inviteMember`、`listInvitations`、`acceptInvitation`、`setActive` 等）。
2. 管理后台自定义 API（`/api/admin/organizations/*`）+ Drizzle 业务表读写。

这带来更高定制能力，同时要求持续保持与 Better Auth 语义一致。

## 9. 已知约束 / 风险
1. 自定义组织角色创建时，重名检查当前是“全局 role 名称检查”，不是按 `organizationId` 作用域检查。
2. 邀请列表排序当前按 `expiresAt` 倒序，不完全等价于按“创建时间”排序。
3. 管理员若不在目标组织成员列表中，无法发送或取消该组织邀请。

## 10. 结论
与旧版文档相比，当前最大的变化是：邀请系统已完整落地（发送、重发、取消、接受、拒绝、列表管理均可用）。
当前主要未启用能力为 Teams；主要优化空间在自定义实现细节一致性（如角色唯一性作用域）。
