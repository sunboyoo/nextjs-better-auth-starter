# Drizzle ORM 使用规范

> 技术栈：Drizzle ORM + PostgreSQL · Schema 定义：`src/db/schema.ts` · 配置：`drizzle.config.ts`

## 1. Schema 管理原则

`src/db/schema.ts` 是数据库 schema 的**唯一真实来源** (Single Source of Truth)。

- 所有表结构变更必须修改此文件，然后通过 Drizzle Kit 生成迁移。
- 禁止手写 SQL 文件修改表结构。
- Better Auth 管理的表（user, session, account, verification 等）同样定义在此文件中，由 `drizzleAdapter` 桥接。

## 2. 迁移工作流

项目配置了以下 Drizzle Kit 命令（见 `package.json`）：

| 命令 | 说明 | 使用场景 |
|---|---|---|
| `npm run db:generate` | 根据 schema 变更生成 SQL 迁移文件到 `./drizzle/` | Schema 变更后 |
| `npm run db:migrate` | 执行待运行的迁移文件 | 部署或同步数据库 |
| `npm run db:push` | 直接将 schema 推送到数据库（无迁移文件） | 开发阶段快速同步 |
| `npm run db:studio` | 启动 Drizzle Studio 可视化数据库管理 | 开发调试 |

### 配置文件

```typescript
// drizzle.config.ts
export default defineConfig({
  out: './drizzle',           // 迁移输出目录
  schema: './src/db/schema.ts', // Schema 定义文件
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 标准变更流程

1. 修改 `src/db/schema.ts`
2. 运行 `npm run db:generate` 生成迁移
3. 检查 `./drizzle/` 中生成的 SQL 确保正确
4. 运行 `npm run db:migrate` 执行迁移

## 3. 查询模式

### 3.1 Select Builder（推荐用于精确控制）

```typescript
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { apps, resources } from "@/db/schema";

const appList = await db
  .select({ id: apps.id, name: apps.name })
  .from(apps)
  .where(eq(apps.organizationId, orgId));
```

### 3.2 Relational Query（推荐用于关联查询）

```typescript
const app = await db.query.apps.findFirst({
  where: eq(apps.id, appId),
  with: {
    resources: {
      with: { actions: true },
    },
    appRoles: true,
  },
});
```

### 3.3 聚合计数（推荐独立查询）

```typescript
import { count, eq } from "drizzle-orm";

const [result] = await db
  .select({ count: count() })
  .from(resources)
  .where(eq(resources.appId, appId));

const totalResources = result?.count ?? 0;
```

## 4. 已知陷阱

### 4.1 SQL 模板字面量子查询

在 `select` 字段中使用 `sql<number>` 模板字面量执行子查询**容易引发运行时 500 错误**，即使 TypeScript 类型检查通过。

**避免此模式：**
```typescript
// ⛔ 有风险：模板字面量子查询
const result = await db.select({
  count: sql<number>`(SELECT COUNT(*) FROM ${resources} WHERE ${resources.appId} = ${apps.id})`
}).from(apps);
```

**使用独立查询替代：**
```typescript
// ✅ 安全：独立计数查询
const app = await db.query.apps.findFirst({
  where: eq(apps.id, appId)
});

const [countResult] = await db
  .select({ count: count() })
  .from(resources)
  .where(eq(resources.appId, appId));
```

**原因**：
- 防止模板字符串格式错误导致的运行时 SQL 语法错误。
- Drizzle 查询构建器确保列名和类型正确。
- 独立查询更易调试和记录日志。

## 5. 数据库连接

```typescript
// src/db/index.ts
import * as schema from "./schema";
import { drizzle } from "drizzle-orm/node-postgres";

export const db = drizzle(process.env.DATABASE_URL!, { schema });
```

- 传入 `schema` 参数启用 relational query API（`db.query.*`）。
- 使用 `DATABASE_URL` 环境变量连接 PostgreSQL。

## 6. 与 Better Auth 的集成

Better Auth 通过 `drizzleAdapter` 桥接本项目的 Drizzle 实例：

```typescript
// src/lib/auth.ts
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // ...
});
```

**重要约束**：
- Better Auth 管理的表（user, session, account 等）通过 `auth.api.*` 操作，不直接用 `db` 写入。
- 业务表（apps, resources, actions 等）通过 `db` 直接操作。
- 详见 `docs/policies/better-auth-access-policy.md` (BA-002)。
