# Better Auth Admin Plugin Usage 模块审查报告

## 1. Executive Summary（执行摘要）

### 结论
⚠️ **整体合规等级：部分合规**

Better Auth Admin Plugin 的 Usage 模块大部分功能已实现，但存在以下问题：
1. **Impersonation 功能完全缺失** - `impersonateUser` 和 `stopImpersonating` 未实现
2. **setUserPassword 合规偏离** - 未使用官方 `auth.api.setUserPassword` API，而是直接操作内部适配器

### Top Risks（关键风险）
| 优先级 | 风险描述 | 严重程度 |
|--------|----------|----------|
| 1 | `setUserPassword` 绕过官方 API，可能导致安全策略不一致 | 🔴 High |
| 2 | Impersonation 功能缺失，影响管理员调试能力 | 🟡 Medium |
| 3 | `listUserSessions` 未使用官方 API，而是直接查 DB | 🟡 Medium |

---

## 2. Scope & Version（审查范围与版本）

- **模块名称**: Better Auth Admin Plugin - Usage
- **审查日期**: 2026-02-04
- **官方文档来源**: [Better Auth Admin Plugin](https://www.better-auth.com/docs/plugins/admin)
- **代码库分支**: main

---

## 3. Implementation Map（实现文件清单）

### 核心工具函数
| 文件路径 | 用途 |
|----------|------|
| `src/utils/auth.ts` | Admin 客户端 API 封装（banUser, unbanUser, createUser, setRole, updateUser 等） |
| `src/utils/users.ts` | 用户列表查询（使用 `auth.api.listUsers`） |
| `src/utils/sessions.ts` | 会话列表查询（直接查 DB） |

### API 路由
| 路由路径 | 文件路径 | 用途 |
|----------|----------|------|
| GET /api/admin/users | `src/app/api/admin/users/route.ts` | 列出用户 |
| POST /api/admin/users/set-password | `src/app/api/admin/users/set-password/route.ts` | 设置密码 |
| GET /api/admin/sessions | `src/app/api/admin/sessions/route.ts` | 列出会话 |
| DELETE /api/admin/sessions/[token] | `src/app/api/admin/sessions/[token]/route.ts` | 撤销单个会话 |
| DELETE /api/admin/users/[userId]/sessions | `src/app/api/admin/users/[userId]/sessions/route.ts` | 撤销用户所有会话 |

### UI 组件
| 文件路径 | 用途 |
|----------|------|
| `src/components/admin/users-table.tsx` | 用户管理表格 |
| `src/components/admin/user-ban-dialog.tsx` | 封禁用户对话框 |
| `src/components/admin/user-unban-dialog.tsx` | 解封用户对话框 |
| `src/components/admin/user-delete-dialog.tsx` | 删除用户对话框 |
| `src/components/admin/user-role-dialog.tsx` | 设置角色对话框 |
| `src/components/admin/user-password-dialog.tsx` | 设置密码对话框 |
| `src/components/admin/user-add-dialog.tsx` | 创建用户对话框 |
| `src/components/admin/user-revoke-sessions-dialog.tsx` | 撤销会话对话框 |
| `src/components/admin/sessions-table.tsx` | 会话管理表格 |
| `src/components/admin/session-revoke-dialog.tsx` | 撤销单个会话对话框 |

---

## 4. Feature Coverage Matrix（功能覆盖矩阵）

| 功能 | 官方 API | 状态 | 实现位置 | 说明 |
|------|----------|------|----------|------|
| createUser | `authClient.admin.createUser` | ✅完整 | `src/utils/auth.ts:57-96` | 使用官方客户端 API |
| listUsers | `auth.api.listUsers` | ✅完整 | `src/utils/users.ts:75-78` | 使用官方服务端 API |
| setRole | `authClient.admin.setRole` | ✅完整 | `src/utils/auth.ts:98-109` | 使用官方客户端 API |
| setUserPassword | `auth.api.setUserPassword` | 🚫偏离 | `src/app/api/admin/users/set-password/route.ts` | 使用 internalAdapter 而非官方 API |
| updateUser | `authClient.admin.updateUser` | ✅完整 | `src/utils/auth.ts:111-145` | 使用官方客户端 API |
| banUser | `authClient.admin.banUser` | ✅完整 | `src/utils/auth.ts:3-19` | 使用官方客户端 API |
| unbanUser | `authClient.admin.unbanUser` | ✅完整 | `src/utils/auth.ts:21-31` | 使用官方客户端 API |
| listUserSessions | `auth.api.listUserSessions` | 🚫偏离 | `src/utils/sessions.ts` | 直接查询数据库而非使用官方 API |
| revokeUserSession | `auth.api.revokeUserSession` | ✅完整 | `src/app/api/admin/sessions/[token]/route.ts:26-30` | 使用官方服务端 API |
| revokeUserSessions | `auth.api.revokeUserSessions` | ✅完整 | `src/app/api/admin/users/[userId]/sessions/route.ts:26-30` | 使用官方服务端 API |
| impersonateUser | `authClient.admin.impersonateUser` | ❌缺失 | - | 功能未实现 |
| stopImpersonating | `authClient.admin.stopImpersonating` | ❌缺失 | - | 功能未实现 |
| removeUser | `authClient.admin.removeUser` | ✅完整 | `src/utils/auth.ts:33-43` | 使用官方客户端 API |

---

## 5. Compliance Matrix（合规矩阵）

| 检查项 | 合规状态 | 证据 | 说明 |
|--------|----------|------|------|
| **createUser SDK 调用** | ✅compliant | `src/utils/auth.ts:76` | `authClient.admin.createUser()` |
| **listUsers SDK 调用** | ✅compliant | `src/utils/users.ts:75` | `auth.api.listUsers()` |
| **setRole SDK 调用** | ✅compliant | `src/utils/auth.ts:99` | `authClient.admin.setRole()` |
| **setUserPassword SDK 调用** | ❌non-compliant | `src/app/api/admin/users/set-password/route.ts:55` | 使用 `ctx.internalAdapter.updatePassword` 而非 `auth.api.setUserPassword` |
| **banUser SDK 调用** | ✅compliant | `src/utils/auth.ts:8` | `authClient.admin.banUser()` |
| **unbanUser SDK 调用** | ✅compliant | `src/utils/auth.ts:22` | `authClient.admin.unbanUser()` |
| **listUserSessions SDK 调用** | ❌non-compliant | `src/utils/sessions.ts` | 直接使用 Drizzle ORM 查询数据库 |
| **revokeUserSession SDK 调用** | ✅compliant | `src/app/api/admin/sessions/[token]/route.ts:26` | `auth.api.revokeUserSession()` |
| **revokeUserSessions SDK 调用** | ✅compliant | `src/app/api/admin/users/[userId]/sessions/route.ts:26` | `auth.api.revokeUserSessions()` |
| **removeUser SDK 调用** | ✅compliant | `src/utils/auth.ts:34` | `authClient.admin.removeUser()` |
| **服务端权限校验** | ✅compliant | `src/lib/api/auth-guard.ts:29-46` | 所有 API 路由使用 `requireAdmin()` |
| **密码哈希安全** | ✅compliant | `src/app/api/admin/users/set-password/route.ts:52` | 使用 `ctx.password.hash()` |

---

## 6. Findings（审查发现）

### 🔴 Critical（严重）

#### F-1: setUserPassword 未使用官方 API
- **位置**: `src/app/api/admin/users/set-password/route.ts:55`
- **问题**: 直接使用 `ctx.internalAdapter.updatePassword()` 而非官方 `auth.api.setUserPassword()`
- **影响**: 可能绕过官方的密码策略钩子和审计日志
- **建议**: 改用 `auth.api.setUserPassword({ body: { userId, newPassword }, headers })`

### 🟡 Medium（中等）

#### F-2: Impersonation 功能缺失
- **问题**: `impersonateUser` 和 `stopImpersonating` 功能完全未实现
- **影响**: 管理员无法模拟用户登录进行调试
- **建议**: 添加 impersonation 功能

#### F-3: listUserSessions 未使用官方 API
- **位置**: `src/utils/sessions.ts`
- **问题**: 使用 Drizzle ORM 直接查询 `session` 表，而非使用 `auth.api.listUserSessions()`
- **影响**: 可能错过官方 API 提供的额外数据处理或过滤
- **注释**: 代码注释表明这是为了支持批量查询多用户会话，官方 API 不支持此用例

### 💚 Low（低）

无

---

## 7. Recommendations & PR Plan（修复建议与 PR 计划）

### PR-1: 修复 setUserPassword 使用官方 API（P1 - 高优先级）

**范围**:
- `src/app/api/admin/users/set-password/route.ts`

**变更**:
```typescript
// 当前实现 (non-compliant)
await ctx.internalAdapter.updatePassword(userId, hashedPassword);

// 建议实现 (compliant)
await auth.api.setUserPassword({
  body: { userId, newPassword },
  headers: await headers(),
});
```

---

### PR-2: 添加 Impersonation 功能（P2 - 中优先级）

**范围**:
- 新建 `src/app/api/admin/users/[userId]/impersonate/route.ts`
- 新建 `src/app/api/admin/stop-impersonating/route.ts`
- 新建 `src/components/admin/user-impersonate-dialog.tsx`
- 修改 `src/components/admin/users-table.tsx` 添加 impersonate 按钮

**变更说明**:
实现 `auth.api.impersonateUser` 和 `auth.api.stopImpersonating` 的调用

---

### PR-3: 评估 listUserSessions 实现方式（P3 - 低优先级）

**范围**:
- `src/utils/sessions.ts`

**说明**:
当前实现支持批量查询多用户会话，这是官方 API 不直接支持的用例。建议：
1. 保留当前实现用于批量场景
2. 对于单用户会话查询，考虑提供使用官方 API 的替代方法

---

## 8. Appendix（附录：证据列表）

### A. setUserPassword 非合规实现

**文件**: `src/app/api/admin/users/set-password/route.ts`
```typescript
// 行 42-63 - 使用 internalAdapter 而非官方 API
const user = await ctx.internalAdapter.findUserById(userId);
// ...
const hashedPassword = await ctx.password.hash(newPassword);
if (credentialAccount) {
  await ctx.internalAdapter.updatePassword(userId, hashedPassword);
} else {
  await ctx.internalAdapter.createAccount({...});
}
```

### B. 合规的 API 调用示例

**文件**: `src/utils/auth.ts`
```typescript
// 行 8-12 - 使用官方客户端 API (compliant)
const res = await authClient.admin.banUser({
  userId,
  banReason,
  banExpiresIn,
});
```

**文件**: `src/app/api/admin/sessions/[token]/route.ts`
```typescript
// 行 24-30 - 使用官方服务端 API (compliant)
await auth.api.revokeUserSession({
  body: {
    sessionToken: token,
  },
  headers: await headers(),
});
```

### C. listUserSessions 非官方实现

**文件**: `src/utils/sessions.ts`
```typescript
// 行 43 - 注释说明为何不使用官方 API
// `listUserSessions` API only supports fetching sessions for a single user.
```

### D. 缺失的 Impersonation 功能

搜索 `impersonateUser` 和 `stopImpersonating` 在代码库中无结果，确认功能未实现。

---

*报告生成时间: 2026-02-04*
