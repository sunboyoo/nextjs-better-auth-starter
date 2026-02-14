# Better Auth Organization 实现审计（当前代码基准）

- 审计日期：2026-02-14
- 审计范围：
  - `src/lib/auth.ts`
  - `src/lib/auth-client.ts`
  - `src/lib/auth-api.ts`
  - `src/db/schema.ts`
  - `src/app/api/admin/organizations/**`
  - `src/app/api/user/organizations/**`
  - `src/app/dashboard/organizations/**`

## 1. 核心配置与架构

| 功能点 | 状态 | 说明 |
|---|---|---|
| Organization 插件启用 | ✅ 已实现 | `src/lib/auth.ts` 已启用 `organization({...})`。 |
| 动态权限控制 | ✅ 已实现 | `dynamicAccessControl.enabled = true`。 |
| Teams 功能 | ✅ 已启用 | `teams: { enabled: true }` 服务端 + 客户端均已配置。 |
| 邀请邮件发送 | ✅ 已实现 | `sendInvitationEmail` 已配置，入口为 `/auth/accept-invitation/[id]`。 |
| 邀请有效期配置 | ✅ 已实现 | 使用 `ORGANIZATION_INVITATION_EXPIRES_IN_DAYS`。 |
| 邀请需邮箱验证 | ✅ 已实现 | `requireEmailVerificationOnInvitation: true`。 |
| 客户端 Organization 能力 | ✅ 已实现 | `organizationClient` 已启用，含 `teams: { enabled: true }`。 |

## 2. 数据模型（Schema）

| 表/结构 | 状态 | 说明 |
|---|---|---|
| `organization` | ✅ 已实现 | 组织主表（name/slug/logo/metadata 等）。 |
| `member` | ✅ 已实现 | 成员关系，含 `(organizationId, userId)` 唯一约束。 |
| `invitation` | ✅ 已实现 | 邀请记录（email/role/status/expiresAt/inviterId）。 |
| `organizationRole` | ✅ 已实现 | 动态组织角色表。 |
| 组织角色唯一性 | ✅ 已实现 | 新增 `(organizationId, role)` 唯一索引。 |
| `team` | ✅ 已实现 | 团队表（id/name/organizationId/createdAt/updatedAt）。 |
| `teamMember` | ✅ 已实现 | 团队成员表（id/teamId/userId/createdAt），含 `(teamId, userId)` 唯一约束。 |

## 3. 管理后台 API 实现现状

| 功能点 | 状态 | 说明 |
|---|---|---|
| 组织列表/详情 | ✅ 已实现 | 使用 Better Auth Organization API 为主，保留本地聚合字段（计数/分页）。 |
| 组织创建/更新/删除 | ✅ 已实现 | 已迁移到官方 API，并补齐 slug 冲突检查。 |
| slug 预检查 | ✅ 已实现 | 新增 `/api/admin/organizations/check-slug`，前端创建/编辑弹窗接入。 |
| 成员列表/添加/移除/改角色 | ✅ 已实现 | 已迁移到官方 API。 |
| 角色列表/创建/更新/删除 | ✅ 已实现 | 已迁移到官方 API。 |
| 邀请列表/发送/重发/取消 | ✅ 已实现 | 已迁移到官方 API。 |
| Teams 管理 (Admin) | ✅ 已实现 | `extendedAuthApi` 提供完整 CRUD：createTeam/updateTeam/removeTeam/listTeamMembers/addTeamMember/removeTeamMember。 |
| 管理动作审计 | ✅ 已实现 | 组织相关关键动作已写入 `admin_audit_log`。 |

## 4. 用户端 API + 前端

| 功能点 | 状态 | 说明 |
|---|---|---|
| Organizations 列表页 | ✅ 已实现 | 使用 `authClient.organization.listOrganizations()`。 |
| Organization 详情 layout | ✅ 已实现 | Tab 导航：Members / Invitations / Teams / Roles / Applications。 |
| Members 页 | ✅ 已实现 | 使用 `authClient.organization.listMembers()`。 |
| Invitations 页 | ✅ 已实现 | 使用 `authClient.organization.getInvitation()` 等。 |
| Teams 列表页 | ✅ 已实现 | 使用 `authClient.organization.listTeams()`，卡片可点击跳转 team 详情。 |
| Team 详情 layout | ✅ 已实现 | 面包屑导航 + team 信息头 + 子导航 tab。 |
| Team Members 页 | ✅ 已实现 | 自建 API `/api/user/.../teams/[teamId]/members`（GET+POST）。 |
| Team Member 详情页 | ✅ 已实现 | 自建 API `/api/user/.../teams/[teamId]/members/[teamMemberId]`（GET+DELETE）。 |
| Roles 页 | ✅ 已实现 | 使用 `authClient.organization` 角色 API。 |
| Applications 页 | ✅ 已实现 | 自建 API `/api/user/.../apps`。 |

## 5. 邀请与成员体验

1. 邀请流（发送、重发、取消、接受、拒绝）全链路可用。
2. 管理员对邀请操作仍受组织成员身份约束（符合插件语义）。
3. 邀请列表支持服务端过滤与分页。

## 6. 权限控制 (Access Control)

组织权限由 `src/lib/built-in-organization-role-permissions.ts` 定义，通过 `createAccessControl` 构建：

| 内置角色 | 来源 | 权限范围 |
|---|---|---|
| `owner` | `ownerAc` (Better Auth 默认) | 组织全部操作（含删除、转让所有权） |
| `admin` | `adminAc` (Better Auth 默认) | 除删除组织和变更 owner 外的全部操作 |
| `member` | `memberAc` (Better Auth 默认) | 只读组织数据 |

- `dynamicAccessControl.enabled = true` 允许在运行时通过 `organization_role` 表创建自定义角色。
- 客户端同步配置：`organizationClient({ ac, dynamicAccessControl: { enabled: true }, teams: { enabled: true } })`。

## 7. 与官方语义一致性

当前实现是"官方 API 优先 + 本地读模型补充"的模式：
1. 变更类操作尽量走 Better Auth 官方 Organization API。
2. 只在管理端列表展示中补充本地统计字段（成员数/角色数等）。
3. 已去除"全局角色名冲突"风险，改为组织内作用域唯一。
4. Team 成员管理使用自建 API 路由（因 `authClient.organization` 不直接暴露 `addTeamMember`/`removeTeamMember` 客户端方法）。

## 8. ⚠️ AI 易混淆知识点

> [!CAUTION]
> **Organization 自动创建同名 Team 的行为**
>
> 当 `teams.enabled = true` 时，better-auth organization 插件有以下**隐式行为**：
>
> - **创建 organization 时会自动创建一个与 organization 同名的 team**
> - 这是 better-auth 的**内部默认行为**，不是本项目自定义的逻辑
> - 配置项 `allowRemovingAllTeams`（默认 `false`）控制是否允许删除组织的最后一个 team
> - 因为默认不允许删除所有 team，所以插件确保在创建 organization 时至少创建一个初始 team
>
> **为什么容易混淆：**
> 1. better-auth 官方文档中没有明显强调这个自动创建行为
> 2. `createTeam` API 文档只描述了手动创建 team 的用法
> 3. 从 API 签名和文档看，team 似乎是完全独立于 organization 创建的
> 4. 但实际上 `teams.enabled = true` + `allowRemovingAllTeams = false`（默认）时，创建 organization 会隐式触发 team 的自动创建
>
> **验证方法：** 创建一个新 organization 后，立即调用 `authClient.organization.listTeams()` 即可看到一个同名 team 已存在。
