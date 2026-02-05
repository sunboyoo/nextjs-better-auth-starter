# Better Auth Organization Dynamic Access Control 审查报告

## 1. Executive Summary

本次审查针对 Better Auth Organization Plugin 的 Dynamic Access Control (动态角色与权限) 模块进行。

**核心结论**：
项目的动态权限管理目前处于“**双重自定义 (Double Custom)**”状态，严重偏离官方合规路径：
1.  **“标准”动态角色 (Roles)**: 虽然使用了官方兼容的 `organizationRole` 数据库表，但其增删改查 (CRUD) 逻辑完全由自定义 API (`/api/admin/organizations/.../roles`) 实现，直接操作数据库，**未调用 Better Auth 的 Plugin SDK**。
2.  **“应用”动态角色 (App Roles)**: 这是一个完全独立于 Better Auth 的、基于自定义 Schema (`apps`, `resources` 等) 的复杂 RBAC 系统，用于实现跨应用/多租户权限控制。

**Top Risks:**
1.  **SDK 旁路风险**: 所有的动态角色管理都绕过了 `auth.api.*` 方法。这意味着 Better Auth 插件内部的 Hooks、事件通知、审计日志等机制完全失效。
2.  **维护负担**: 前端组件重度依赖自定义 API 的数据结构，未来如果想要切换回官方 SDK，需要同时重构前后端大量代码。
3.  **一致性风险**: 官方文档指出前端应使用 `authClient.organization.createRole` 等方法，当前实现却使用了手动 `fetch` 和 `useSWR` 请求自定义路由，导致鉴权逻辑分散。

---

## 2. Scope & Version

- **Commit SHA**: (当前工作区)
- **审查模块**: Dynamic Access Control Module
- **审查时间**: 2026-02-03
- **涉及文档**: `docs/better-auth/organization/dynamic-access-control.md`
- **涉及文件**:
    - `src/app/api/admin/organizations/[organizationId]/roles/**` (Custom Roles API)
    - `src/app/api/admin/organizations/[organizationId]/apps/**` (Custom App Roles API)
    - `src/components/admin/organization-role-table.tsx`
    - `src/db/schema.ts`

---

## 3. Implementation Map

| 功能层级 | 职责 | 关键实现文件 | 状态 |
| :--- | :--- | :--- | :--- |
| **Standard Schema** | 存储动态角色定义 | `src/db/schema.ts` (`organizationRole`) | ✅ Compliant (Compatible) |
| **Roles CRUD (Server)** | 管理组织级角色的增删改查 | `api/admin/organizations/[id]/roles/route.ts` | 🚫 Non-Compliant (Direct DB Access) |
| **Roles CRUD (Client)** | 前端管理界面交互 | `components/admin/organization-role-table.tsx` | 🚫 Non-Compliant (Calls Custom API) |
| **Permission Check** | 验证用户是否拥有动态权限 | `api/rbac/permissions/check/route.ts` | 🚫 Non-Compliant (Custom Logic) |
| **Configuration** | 插件功能开启配置 | `src/lib/auth.ts` (`dynamicAccessControl: { enabled: true }`) | ✅ Compliant |

---

## 4. Feature Coverage Matrix

对比官方文档 `dynamic-access-control.md` 与实际实现：

| 功能点 | 官方推荐 API/方法 | 实现状态 | 说明 |
| :--- | :--- | :--- | :--- |
| **Enable Module** | `dynamicAccessControl: { enabled: true }` | ✅ 完整 | 配置已正确开启。 |
| **Create Role** | `auth.api.createOrgRole` / `authClient...` | ❌ 替代实现 | 使用了自定义 `POST /api/admin/.../roles`，直接 `db.insert`。 |
| **Update Role** | `auth.api.updateOrgRole` | ❌ 替代实现 | 使用了自定义路由，直接 `db.update`。 |
| **Delete Role** | `auth.api.deleteOrgRole` | ❌ 替代实现 | 使用了自定义 `DELETE` 路由，直接 `db.delete`。 |
| **List Roles** | `auth.api.listOrgRoles` | ❌ 替代实现 | 使用了自定义 `GET` 路由，直接 `db.select`。 |
| **Check Permission** | `authClient.organization.checkRolePermission` | ❌ 未使用 | 代码中无引用，使用了自定义 `permissions/check` API。 |

---

## 5. Compliance Matrix

| 检查项 | 官方 Best Practice | 现状 | 判定 |
| :--- | :--- | :--- | :--- |
| **API 调用** | 服务端应调用 `auth.api.*` 方法管理角色 | 直接使用 Drizzle (`db.*`) 操作 `organizationRole` 表 | ❌ Non-Compliant |
| **权限控制** | 角色管理本身应受 `ac` (create/update role) 权限控制 | 通过 `requireAdmin()` 仅允许平台管理员操作 | ⚠️ Partial (失去了插件内部细粒度控制) |
| **数据结构** | `permission` 字段应为 JSON Object | 现状符合，但在 Custom App Roles 中被拆解为多表关系 | ✅ Compliant (Standard Roles 部分) |
| **客户端集成** | 使用 `authClient` hook 进行交互 | 使用 `fetch` + `useSWR` 调用自定义 API | ❌ Non-Compliant |

---

## 6. Findings

### 🔥 Critical Findings
1.  **重复造轮子 (Reinventing the Wheel)**:
    Better Auth 插件本身已经封装了完善的 Role CRUD 逻辑（包括输入校验、权限验证、Hooks），但项目中完全手写了一套一模一样的逻辑在 `src/app/api/admin/organizations/[organizationId]/roles/route.ts`。
    这不仅增加了代码维护量，还引入了潜在的 Bug 风险（例如：手动生成的 ID 可能与插件生成的格式不一致，尽管目前都用了 nanoid）。

2.  **App Roles 系统复杂度过高**:
    项目引入了一套完全平行的 "Organization App Roles" 系统，虽然解决了多应用场景，但与 Better Auth 的 Dynamic Roles 概念产生了混淆。开发者可能困惑于“我该用 Standard Role 还是 App Role？”。

### ⚠️ Major Findings
1.  **Delete Role 缺乏级联检查**:
    自定义的 `delete` 逻辑比较简单，直接删除角色。官方 API 可能会处理更复杂的级联逻辑（如检查是否有成员分配了该角色并在某些配置下阻止删除，或者级联更新成员角色）。直接操作 DB 容易破坏这一层保护。

---

## 7. Recommendations & PR Plan

### 🚨 PR 1: 重构标准角色管理 API (Refactor Roles API)
*   **目标**: 移除 `api/admin/organizations/[id]/roles` 中的直接 DB 操作。
*   **行动**:
    *   修改 `GET` 逻辑：调用 `auth.api.listOrgRoles`。
    *   修改 `POST` 逻辑：调用 `auth.api.createOrgRole`。
    *   修改 `DELETE` 逻辑：调用 `auth.api.deleteOrgRole`。
    *   注意：需要适配一下 Response 格式，确保前端 `OrganizationRoleTable` 不崩溃，或者同步修改前端。

### 🛠️ PR 2: 迁移前端到 Auth Client (Migrate Frontend)
*   **目标**: 使用官方客户端 SDK 替代手动 fetch。
*   **行动**:
    *   在 `OrganizationRoleTable` 中，尝试使用 `authClient.organization.useListRoles()` (如果 SDK 支持 Hook) 或者保留 `useSWR` 但指向标准化的 API。
    *   将 Delete/Create 操作替换为 `authClient.organization.createRole` 调用。

### 🔮 PR 3: 明确 App Roles 定位 (Strategic)
*   **目标**: 在文档或代码中明确区分 "Standard Roles" 和 "App Roles"。
*   **建议**: 如果 App Roles 是核心业务，建议将其封装为一个独立的 Better Auth Plugin，使其融入生态，而不是作为游离的 API 路由存在。
