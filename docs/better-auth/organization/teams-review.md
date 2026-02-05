# Better Auth Organization Teams 审查报告

## 1. Executive Summary

本次审查针对 Better Auth Organization Plugin 的 Teams (团队) 模块进行。

**核心结论**：
Teams 是 Better Auth 的**可选功能**，项目当前**未启用**此功能。这是合理的设计选择，无需修复。

**合规性评分**: ⚪ N/A (Feature Not Enabled)

---

## 2. Scope & Version

- **Commit SHA**: (当前工作区)
- **审查模块**: Teams Module (Optional Feature)
- **审查时间**: 2026-02-03
- **涉及文档**: `docs/better-auth/organization/teams.md`
- **涉及文件**: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/db/schema.ts`

---

## 3. Feature Status

| 检查项 | 官方要求 | 项目状态 | 说明 |
| :--- | :--- | :--- | :--- |
| Server `teams` 配置 | `organization({ teams: { enabled: true } })` | ❌ 未配置 | `auth.ts` 中无 `teams` 选项 |
| Client `teams` 配置 | `organizationClient({ teams: { enabled: true } })` | ❌ 未配置 | `auth-client.ts` 中无 `teams` 选项 |
| DB Schema `team` 表 | `team` 表定义 | ❌ 不存在 | `schema.ts` 中无 `team` 表 |
| DB Schema `teamMember` 表 | `teamMember` 表定义 | ❌ 不存在 | `schema.ts` 中无 `teamMember` 表 |
| Session `activeTeamId` 字段 | `session.activeTeamId` | ❌ 未添加 | `session` 表无此字段 |
| Invitation `teamId` 字段 | `invitation.teamId` | ❌ 未添加 | `invitation` 表无此字段 |

---

## 4. Teams Feature Overview

根据官方文档，Teams 功能提供以下 API：

| 功能 | 说明 | 项目实现 |
| :--- | :--- | :--- |
| `createTeam` | 创建团队 | ⚪ 未启用 |
| `listTeams` | 列出组织团队 | ⚪ 未启用 |
| `updateTeam` | 更新团队 | ⚪ 未启用 |
| `removeTeam` | 删除团队 | ⚪ 未启用 |
| `setActiveTeam` | 设置活跃团队 | ⚪ 未启用 |
| `listUserTeams` | 列出用户团队 | ⚪ 未启用 |
| `listTeamMembers` | 列出团队成员 | ⚪ 未启用 |
| `addTeamMember` | 添加团队成员 | ⚪ 未启用 |
| `removeTeamMember` | 移除团队成员 | ⚪ 未启用 |

---

## 5. Recommendations

### 如需启用 Teams 功能

如果未来业务需要启用 Teams，需完成以下步骤：

1. **Server 配置** (`src/lib/auth.ts`):
```typescript
organization({
  // ... existing config
  teams: {
    enabled: true,
    maximumTeams: 10, // 可选：限制每个组织的团队数量
    allowRemovingAllTeams: false, // 可选：防止删除最后一个团队
  },
}),
```

2. **Client 配置** (`src/lib/auth-client.ts`):
```typescript
organizationClient({
  // ... existing config
  teams: {
    enabled: true,
  },
}),
```

3. **数据库 Schema** (`src/db/schema.ts`):
```typescript
export const team = table("team", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export const teamMember = table("team_member", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

4. **Session 扩展**:
```typescript
// 在 session 表添加
activeTeamId: text("active_team_id"),
```

5. **Invitation 扩展**:
```typescript
// 在 invitation 表添加
teamId: text("team_id"),
```

---

## 6. Compliance Summary

| 检查项 | 状态 | 说明 |
| :--- | :--- | :--- |
| 功能启用状态 | ⚪ | 可选功能，未启用 |
| 配置一致性 | ✅ | Server/Client 均未配置 |
| Schema 完整性 | ✅ | 未启用功能无需定义相关表 |

**整体评价**: Teams 是可选功能，项目选择不启用是合理的设计决策。如需启用，按上述步骤操作即可。
