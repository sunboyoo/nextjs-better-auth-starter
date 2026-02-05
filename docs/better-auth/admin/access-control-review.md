# Better Auth Admin Plugin Access Control 模块审查报告

## 1. Executive Summary（执行摘要）

### 结论
⚠️ **整体合规等级：部分合规**

Better Auth Admin Plugin 的 Access Control 模块采用默认配置，未使用自定义权限系统。权限检查通过简单的角色字符串比较实现，而非官方推荐的 `auth.api.userHasPermission` API。

### Top Risks（关键风险）
| 优先级 | 风险描述 | 严重程度 |
|--------|----------|----------|
| 1 | 未使用官方 `userHasPermission` / `hasPermission` API | 🟡 Medium |
| 2 | Admin plugin 未配置自定义 AC 和 roles | 🟡 Medium |
| 3 | 无法使用细粒度权限控制（如仅允许 ban 不允许 delete） | 🟡 Medium |

---

## 2. Scope & Version（审查范围与版本）

- **模块名称**: Better Auth Admin Plugin - Access Control
- **审查日期**: 2026-02-04
- **官方文档来源**: [Better Auth Admin Plugin](https://www.better-auth.com/docs/plugins/admin)
- **代码库分支**: main

---

## 3. Implementation Map（实现文件清单）

### 核心配置文件
| 文件路径 | 用途 |
|----------|------|
| `src/lib/auth.ts` | Admin plugin 服务端配置 |
| `src/lib/auth-client.ts` | AdminClient 客户端配置 |
| `src/lib/built-in-user-role-permissions.ts` | 用户角色权限定义（使用 defaultStatements） |
| `src/lib/built-in-organization-role-permissions.ts` | 组织角色权限定义（用于 organization plugin） |

### 权限检查实现
| 文件路径 | 用途 |
|----------|------|
| `src/lib/api/auth-guard.ts` | 自定义权限守卫（`requireAdmin`） |
| `src/app/api/rbac/permissions/check/route.ts` | 自定义 RBAC 权限检查（用于组织级应用权限） |

---

## 4. Feature Coverage Matrix（功能覆盖矩阵）

| 功能 | 来源 | 状态 | 实现位置 | 说明 |
|------|------|------|----------|------|
| **默认角色 (admin/user)** | 官方文档 | ✅完整 | `src/lib/auth.ts:129-132` | `defaultRole: "user"`, `adminRoles: ["admin"]` |
| **默认权限 (user/session 资源)** | 官方文档 | ✅完整 | Better Auth 内置 | 使用默认配置，自动获得默认权限 |
| **createAccessControl** | 官方文档 | ⚠️部分 | `src/lib/built-in-organization-role-permissions.ts:22` | 仅用于 organization plugin，未用于 admin plugin |
| **自定义角色 (ac.newRole)** | 官方文档 | ⚠️部分 | `src/lib/built-in-organization-role-permissions.ts:30-40` | 仅用于 organization plugin |
| **传递 AC/roles 到 admin plugin** | 官方文档 | ❌缺失 | - | admin plugin 未配置自定义 AC 和 roles |
| **传递 AC/roles 到 adminClient** | 官方文档 | ❌缺失 | `src/lib/auth-client.ts:8` | adminClient 未配置自定义 AC 和 roles |
| **hasPermission (客户端)** | 官方文档 | ❌缺失 | - | 未找到 `authClient.admin.hasPermission` 调用 |
| **userHasPermission (服务端)** | 官方文档 | ❌缺失 | - | 未找到 `auth.api.userHasPermission` 调用 |
| **checkRolePermission (客户端)** | 官方文档 | ❌缺失 | - | 未找到 `authClient.admin.checkRolePermission` 调用 |
| **多角色支持 (逗号分隔)** | 官方文档 | ❓Unknown | - | 未验证是否支持，当前仅校验 `role === "admin"` |

---

## 5. Compliance Matrix（合规矩阵）

| 检查项 | 合规状态 | 证据 | 说明 |
|--------|----------|------|------|
| **默认角色配置** | ✅compliant | `src/lib/auth.ts:130-131` | 正确配置 defaultRole 和 adminRoles |
| **权限检查方式** | ❌non-compliant | `src/lib/api/auth-guard.ts:34` | 使用 `role === "admin"` 而非 `userHasPermission` |
| **细粒度权限控制** | ❌non-compliant | - | 未实现官方推荐的资源/操作级权限检查 |
| **自定义权限扩展** | ⚠️partial | `src/lib/built-in-user-role-permissions.ts` | 定义了权限结构但未集成到 admin plugin |
| **客户端权限检查** | ❌non-compliant | - | 未使用 `hasPermission` 或 `checkRolePermission` |
| **多角色用户支持** | ⚠️partial | - | 依赖 Better Auth 默认处理，未验证自定义场景 |

---

## 6. Findings（审查发现）

### 🔴 Critical（严重）

无

### 🟡 Medium（中等）

#### F-1: 权限检查未使用官方 API
- **位置**: `src/lib/api/auth-guard.ts:34`
- **问题**: 使用简单字符串比较 `session.user.role !== "admin"` 进行权限判断
- **影响**: 
  - 无法实现细粒度权限控制（如仅允许某操作）
  - 不支持多角色用户的正确权限检查
  - 无法自定义权限策略
- **建议**: 使用 `auth.api.userHasPermission` 进行权限检查

```typescript
// 当前实现 (non-compliant)
if (!session || session.user.role !== "admin") { ... }

// 建议实现 (compliant)
const hasAccess = await auth.api.userHasPermission({
  body: { userId: session.user.id, permission: { user: ["list"] } },
  headers: await headers()
});
if (!hasAccess.success) { ... }
```

#### F-2: Admin plugin 未配置自定义 AC
- **位置**: `src/lib/auth.ts:129-132`
- **问题**: admin plugin 仅配置 `defaultRole` 和 `adminRoles`，未传入自定义 AC 和 roles
- **影响**: 无法扩展自定义资源和权限
- **建议**: 如需自定义权限，添加 AC 和 roles 配置

#### F-3: AdminClient 未配置自定义 AC
- **位置**: `src/lib/auth-client.ts:8`
- **问题**: `adminClient()` 无参数调用
- **影响**: 客户端无法使用 `hasPermission` 和 `checkRolePermission` 检查自定义权限
- **建议**: 如需客户端权限检查，添加 AC 和 roles 配置

### 💚 Low（低）

#### F-4: 权限定义未集成
- **位置**: `src/lib/built-in-user-role-permissions.ts`
- **问题**: 正确引用了 `defaultStatements` 但未集成到 admin plugin
- **影响**: 权限定义仅供参考，未实际生效

---

## 7. Recommendations & PR Plan（修复建议与 PR 计划）

### 评估说明

当前实现使用简化的角色检查方式，在以下场景下是合理的：
- **仅需区分 admin 和普通用户**
- **不需要细粒度权限控制**（如仅允许 ban 用户但不允许删除用户）
- **不需要自定义资源权限**

如果未来需要更复杂的权限控制，建议执行以下 PR：

---

### PR-1: 增强权限检查使用官方 API（P2 - 按需）

**前提条件**: 需要细粒度权限控制时实施

**范围**:
- `src/lib/api/auth-guard.ts`

**变更**:
```typescript
// 添加权限检查函数
export async function requirePermission(
  permission: Record<string, string[]>
): Promise<AuthResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return unauthorized();

  const hasAccess = await auth.api.userHasPermission({
    body: { userId: session.user.id, permission },
    headers: await headers()
  });
  
  if (!hasAccess.success) return unauthorized();
  return { success: true, session: session.session, user: session.user };
}
```

---

### PR-2: 配置 Admin plugin 自定义 AC（P3 - 可选）

**前提条件**: 需要扩展自定义资源（如 `project`, `report` 等）

**范围**:
- 新建 `src/lib/admin-permissions.ts`
- 修改 `src/lib/auth.ts`
- 修改 `src/lib/auth-client.ts`

**变更说明**:
1. 创建 admin 专用的权限定义文件
2. 在 admin plugin 中配置 AC 和 roles
3. 在 adminClient 中配置相同的 AC 和 roles

---

## 8. Appendix（附录：证据列表）

### A. Admin Plugin 配置

**文件**: `src/lib/auth.ts`
```typescript
// 行 129-132 - 使用默认配置
admin({
  defaultRole: "user",
  adminRoles: ["admin"],
}),
```

### B. AdminClient 配置

**文件**: `src/lib/auth-client.ts`
```typescript
// 行 8 - 无自定义 AC 配置
adminClient(),
```

### C. 权限检查实现（非官方方式）

**文件**: `src/lib/api/auth-guard.ts`
```typescript
// 行 29-46 - 使用角色字符串比较
export async function requireAdmin(): Promise<AuthResult> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
        return {
            success: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }
    // ...
}
```

### D. 用户角色权限定义

**文件**: `src/lib/built-in-user-role-permissions.ts`
```typescript
// 行 1-24 - 引用 defaultStatements 但未集成到 plugin
import { defaultStatements } from "better-auth/plugins/admin/access";

export const BUILT_IN_USER_ROLES = [
    {
        id: "admin",
        role: "admin",
        description: "Administrator with full access...",
        permissions: {
            ...defaultStatements,
        },
        isBuiltIn: true,
    },
    // ...
];
```

### E. 自定义 RBAC 系统（与 admin plugin 无关）

**文件**: `src/app/api/rbac/permissions/check/route.ts`
```typescript
// 行 62 - 同样使用 role === "admin" 校验
if (session.user.role !== "admin") {
    // 检查成员记录...
}
```

> [!NOTE]
> 项目包含一个独立的自定义 RBAC 系统（`src/app/api/rbac/*`），用于组织级应用权限管理，与 Better Auth admin plugin 的 access control 不同。该系统支持动态定义 apps、resources、actions 和 roles，直接使用数据库查询实现权限检查。

---

*报告生成时间: 2026-02-04*
