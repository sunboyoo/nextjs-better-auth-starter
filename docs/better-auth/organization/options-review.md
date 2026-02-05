# Better Auth Organization Options 审查报告

## 1. Executive Summary

本次审查针对 Better Auth Organization Plugin 的 Options (配置选项) 模块进行。

**核心结论**：
项目的 Organization 插件配置**整体合规**，已正确使用了最关键的选项。部分可选配置使用了 Better Auth 的默认值，这是合理的做法。

**合规性评分**: 🟢 Compliant (with minor recommendations)

---

## 2. Scope & Version

- **Commit SHA**: (当前工作区)
- **审查模块**: Options Module (Plugin Configuration)
- **审查时间**: 2026-02-03
- **涉及文档**: `docs/better-auth/organization/options.md`
- **涉及文件**:
    - `src/lib/auth.ts` (Plugin Configuration)
    - `src/lib/constants.ts` (Configuration Constants)

---

## 3. Configuration Coverage Matrix

对比官方文档 `options.md` 与 `auth.ts` 中的实际配置：

| 配置项 | 官方说明 | 默认值 | 项目配置 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **ac** | Access Control 定义 | - | ✅ `ac` (from `built-in-organization-role-permissions.ts`) | ✅ Configured |
| **dynamicAccessControl** | 启用动态角色 | `{ enabled: false }` | ✅ `{ enabled: true }` | ✅ Configured |
| **allowUserToCreateOrganization** | 用户自助创建权限 | `true` | ⚪ 未设置 (使用默认 `true`) | ⚪ Default |
| **organizationLimit** | 用户可创建的组织数量上限 | `unlimited` | ⚪ 未设置 (使用默认无限) | ⚪ Default |
| **creatorRole** | 创建者默认角色 | `owner` | ⚪ 未设置 (使用默认 `owner`) | ⚪ Default |
| **membershipLimit** | 组织成员数量上限 | `100` | ⚪ 未设置 (使用默认 `100`) | ⚪ Default |
| **sendInvitationEmail** | 邀请邮件发送函数 | - | ✅ 已实现 (使用 `sendEmail`) | ✅ Configured |
| **invitationExpiresIn** | 邀请链接有效期 (秒) | `172800` (48h) | ✅ `7 * 24 * 60 * 60` (7 days) | ✅ Configured |
| **cancelPendingInvitationsOnReInvite** | 重复邀请时取消旧邀请 | `false` | ⚪ 未设置 (使用默认 `false`) | ⚪ Default |
| **invitationLimit** | 用户可发送的邀请数量上限 | `100` | ⚪ 未设置 (使用默认 `100`) | ⚪ Default |
| **requireEmailVerificationOnInvitation** | 接受邀请前需验证邮箱 | `false` | ✅ `true` | ✅ Configured |

---

## 4. Configuration Details

### ✅ Configured Options (Explicit)

项目在 `src/lib/auth.ts` 中显式配置了以下选项：

```typescript
organization({
  ac,                                             // ✅ Access Control
  dynamicAccessControl: { enabled: true },         // ✅ Dynamic Roles
  invitationExpiresIn: ORGANIZATION_INVITATION_EXPIRES_IN_DAYS * 24 * 60 * 60, // ✅ 7 days
  requireEmailVerificationOnInvitation: true,       // ✅ Email verification required
  async sendInvitationEmail(data) { ... },         // ✅ Custom email sender
}),
```

- **`invitationExpiresIn`**: 使用常量 `ORGANIZATION_INVITATION_EXPIRES_IN_DAYS = 7` (定义在 `constants.ts`)，转换为秒。这比默认的 48 小时更长，适合需要更宽裕接受时间的场景。
- **`requireEmailVerificationOnInvitation`**: 设置为 `true`，这是一个良好的安全实践，可防止恶意邮箱接受邀请。
- **`sendInvitationEmail`**: 正确实现了邮件发送逻辑，使用了 `sendEmail` 工具函数。

### ⚪ Default Options (Implicit)

以下选项未显式配置，将使用 Better Auth 默认值：
- `allowUserToCreateOrganization`: `true` - 用户可自助创建
- `organizationLimit`: 无限制
- `creatorRole`: `owner`
- `membershipLimit`: `100`
- `cancelPendingInvitationsOnReInvite`: `false`
- `invitationLimit`: `100`

---

## 5. Findings & Recommendations

### ✅ Good Practices
1.  **邮箱验证强制开启**: `requireEmailVerificationOnInvitation: true` 是一个明智的安全选择。
2.  **邀请有效期可配置化**: 使用常量 `ORGANIZATION_INVITATION_EXPIRES_IN_DAYS` 便于后续调整。
3.  **邮件发送实现完整**: `sendInvitationEmail` 包含了邀请链接、过期时间等关键信息。

### ⚠️ Minor Recommendations

1.  **考虑设置 `organizationLimit` (可选)**:
    如果项目是 SaaS 模式，可能需要根据用户订阅计划限制可创建的组织数量。
    ```typescript
    organizationLimit: async (user) => {
      const plan = await getUserPlan(user.id);
      return plan.organizationLimit <= (await countUserOrganizations(user.id));
    },
    ```

2.  **考虑设置 `allowUserToCreateOrganization` (可选)**:
    根据之前的 Organization 模块审查，用户侧目前没有创建组织的入口。如果这是设计意图（仅 Admin 可创建），应显式设置为 `false` 以明确意图：
    ```typescript
    allowUserToCreateOrganization: false, // Only admins can create organizations
    ```

3.  **考虑 `cancelPendingInvitationsOnReInvite`**:
    当重复邀请同一邮箱时，是否应该取消旧邀请？默认为 `false`（保留旧邀请）。根据业务需求，可能需要调整。

---

## 6. Compliance Summary

| 检查项 | 状态 | 说明 |
| :--- | :--- | :--- |
| 核心配置 (`ac`, `dynamicAccessControl`) | ✅ | 正确配置 |
| 邀请配置 (`invitationExpiresIn`, `sendInvitationEmail`) | ✅ | 正确配置 |
| 安全配置 (`requireEmailVerificationOnInvitation`) | ✅ | 正确启用 |
| 业务可选配置 (`organizationLimit`, `membershipLimit`) | ⚪ | 使用默认值，可根据需求调整 |

**整体评价**: 配置合规，无严重问题。建议根据业务需求考虑显式设置 `allowUserToCreateOrganization`。
