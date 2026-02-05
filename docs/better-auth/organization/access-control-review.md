# Better Auth Organization Access Control 审查报告

## 1. Executive Summary

本次审查针对 Better Auth Organization Plugin 的 Access Control 模块进行。**核心发现**：项目目前采用“**混合鉴权架构**”。
基础的成员管理（加入/退出/基本角色）使用了 Better Auth 官方的 Organization Plugin 能力，但在核心业务权限控制上，实现了一套**完全自定义的、基于数据库的多应用 RBAC 系统**（涉及 `apps`, `resources`, `actions`, `organization_app_roles` 等表）。

这种混合架构虽然满足了“多应用隔离”的复杂业务需求，但严重偏离了 Better Auth 官方推荐的 `ac` (Access Control) 最佳实践，导致权限校验逻辑分散，且存在直接查询数据库进行鉴权的 Non-Compliant 行为。

**Top Risks:**
1.  **鉴权旁路风险**: 核心业务权限校验通过自定义 API (`/api/rbac/permissions/check`) 实现，绕过了 Better Auth 的统一鉴权流 (`auth.api.hasPermission`)。
2.  **维护成本高**: 维护了两套权限定义（`built-in-organization-role-permissions.ts` 中的静态定义 vs 数据库中的动态 RBAC 表），容易导致逻辑不一致。
3.  **性能隐患**: 自定义鉴权 API 虽然有简单内存缓存，但每次鉴权都需要复杂的多表联查 (5表 Join)，在大并发下可能成为瓶颈。

---

## 2. Scope & Version

- **Commit SHA**: (当前工作区)
- **审查模块**: Access Control (Organization Plugin & Custom RBAC)
- **审查时间**: 2026-02-03
- **涉及路径**:
    - `docs/better-auth/organization/access-control.md`
    - `src/lib/auth.ts`, `src/lib/auth-client.ts`
    - `src/db/schema.ts`
    - `src/app/api/rbac/**`
    - `src/components/admin/**`

---

## 3. Implementation Map

通过分析，模块被划分为“基础层”与“扩展层”：

| 模块分层 | 职责 | 关键文件路径 | 备注 |
| :--- | :--- | :--- | :--- |
| **基础层 (Better Auth)** | 组织成员管理、基础角色 (Owner/Admin/Member) | `src/lib/auth.ts`<br>`src/lib/built-in-organization-role-permissions.ts` | 符合官方标准 |
| **扩展层 (Custom RBAC)** | 多应用细粒度权限、动态角色、权限树管理 | `src/db/schema.ts` (RBAC Tables)<br>`src/app/api/rbac/permissions/check/route.ts` | **完全自定义实现** |
| **UI 层** | 权限配置、角色分配 | `src/components/admin/organization-permission-tree-selector.tsx`<br>`src/components/admin/organization-role-table.tsx` | |

---

## 4. Feature Coverage Matrix

对比官方文档与实际实现：

| 功能点 | 官方推荐 | 实现状态 | 说明 |
| :--- | :--- | :--- | :--- |
| **Static Roles** | `sysAdmin`, `owner`, `admin`, `member` | ✅ 完整 | 在 `built-in-organization-role-permissions.ts` 中定义，且在 `schema.ts` 的 `member` 表中有字段。 |
| **Permissions Definition** | `createAccessControl` (Resources & Actions) | ⚠️ 部分/混合 | 虽然代码中调用了 `createAccessControl`，但实际业务权限主要定义在数据库 (`actions`, `resources` 表) 中。 |
| **Check Permission (API)** | `auth.api.hasPermission` | 🚫 实现偏离 | **未采用官方 API**。使用了自定义路由 `/api/rbac/permissions/check` 进行鉴权。 |
| **Check Permission (Client)** | `authClient.organization.hasPermission` | 🚫 实现偏离 | 前端主要依赖 fetch 自定义 API 获取权限数据，而非使用 SDK 方法。 |
| **Dynamic Access Control** | `dynamicAccessControl: { enabled: true }` | ⚠️ 伪实现 | 配置中开启了 `enabled: true`，但实际的动态权限管理是**另外一套独立的数据库 Schema**，并未复用 Better Auth 插件内部的动态表逻辑。 |
| **Role Management** | `newRole`, `updateRole` via Plugin API | ❌ 缺失/自定义 | 角色创建走的是自定义 CRUD 逻辑 (`organization_app_roles` 表)，而非 Better Auth Plugin API。 |

---

## 5. Compliance Matrix

对照 Better Auth 最佳实践：

| 检查项 | 官方 Best Practice | 现状 | 判定 |
| :--- | :--- | :--- | :--- |
| **SDK Usage** | 使用 `auth.api.*` 进行所有鉴权操作 | 使用原生 SQL/Drizzle 查询数据库 | ❌ Non-Compliant |
| **Schema Design** | 复用 Plugin 提供的 Schema | 自定义了 6+ 张 RBAC 相关表 (`apps`, `resources`...) | ⚠️ Custom (虽不违规但增加了复杂性) |
| **Authorization** | 鉴权逻辑应在服务层统一封装 | 鉴权逻辑散落在 `api/rbac` 路由和各个组件中 | ❌ Non-Compliant |
| **Type Safety** | 利用 TypeScript `as const` 推断权限类型 | 数据库驱动的动态权限，丢失了部分静态类型检查优势 | ⚠️ Partial |
| **Performance** | 利用 Plugin 内置缓存与优化 | 自定义了简单的 `Map` 内存缓存，缺乏分布式缓存支持 | ⚠️ Partial |

---

## 6. Findings

### 🔥 Critical Findings
1.  **鉴权体系割裂**:
    `auth.ts` 中配置了 Better Auth 的 Access Control，但在实际业务中（如 `src/app/api/rbac`）完全闲置了这套机制，转而使用一套自定义的 DB 查询逻辑。这导致 `auth.api.hasPermission` 等官方 SDK 方法无法验证自定义的业务权限。

2.  **不安全的自定义鉴权 API**:
    `/api/rbac/permissions/check` 路由虽然有基本的 ACL（只允许 admin 或本人查询），但其核心逻辑不仅**重复造轮子**，还引入了复杂的 5 表联查，且完全脱离了 Better Auth 的生态（如 Audit Logs, Hooks 等可能无法触发）。

3.  **Dynamic Access Control 配置虚设**:
    在 `auth.ts` 中开启了 `dynamicAccessControl: true`，这通常意味着 Better Auth 会接管动态权限表。但实际上项目使用的是自定义表结构，这个配置可能除了增加构建负担外没有实际作用，或者两者在混用导致潜在冲突。

### ⚠️ Major Findings
1.  **复杂的自定义 Schema**:
    引入了 `apps` -> `resources` -> `actions` 的三层结构。虽然这提供了极其强大的“多租户/多应用”能力，但这大大超出了标准 Organization Plugin 的设计范畴。
    *建议*: 这种复杂度是合理的业务需求，但应通过 Custom Plugin 或 Adapter 接入 Better Auth，而不是彻底旁路。

---

## 7. Recommendations & PR Plan

建议分阶段进行重构，目标是将自定义的 RBAC 逻辑**收敛**到 Better Auth 的体系中，或至少标准化鉴权接口。

### 🚨 PR 1: 标准化鉴权接口 (High Priority)
*   **目标**: 废弃或封装直接的 DB 查询，尽可能适配 `auth.api.hasPermission` 的调用风格。
*   **内容**:
    *   创建一个 Server Action 或 Helper Function 封装 `/api/rbac/permissions/check` 的逻辑。
    *   在前端统一使用 hook 封装权限检查，使其调用签名接近 `useSession` 或 `authClient`。

### 🛠️ PR 2: 清理冗余配置 (Medium Priority)
*   **目标**: 明确 `dynamicAccessControl` 的用途。
*   **内容**:
    *   如果确实不使用 Better Auth 内置的动态权限表，考虑关闭 `auth.ts` 中的 `dynamicAccessControl` 选项，避免误导。
    *   或者（更高级方案）编写一个适配器，将自定义的 DB 权限注入到 Better Auth 的 context 中，使得 `auth.api.hasPermission` 能生效。

### 📈 PR 3: 优化自定义鉴权性能 (Performance)
*   **目标**: 优化 `check/route.ts`。
*   **内容**:
    *   目前的 `5-join` 查询在此处是必须的，但建议增加更持久的缓存层 (如 Redis 或 `unstable_cache` of Next.js)，替代当前不安全的全局变量 `Map` 缓存（在 Serverless/Edge 环境下无效）。

---

## 8. Appendix

- **自定义鉴权逻辑入口**: `src/app/api/rbac/permissions/check/route.ts:39`
- **自定义 Schema 定义**: `src/db/schema.ts:239` (RBAC Extension Tables)
- **Better Auth 配置**: `src/lib/auth.ts:133`
