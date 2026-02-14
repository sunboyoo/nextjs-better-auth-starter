# Drizzle ORM Best Practices

## 🚨 Critical Check: SQL Template Literals

### The Issue with `sql<number>` in Subqueries
Using SQL template literals for subqueries (like `(SELECT COUNT(*) FROM ...)`) inside `select` fields is **error-prone** and can cause **500 Internal Server Errors** at runtime, even if TypeScript types check out.

**❌ Avoid this pattern:**
```typescript
import { sql } from "drizzle-orm";

const result = await db.select({
  // ⛔️ Risky: Template literal subquery
  count: sql<number>`(SELECT COUNT(*) FROM ${resources} WHERE ${resources.appId} = ${apps.id})`
}).from(apps);
```

### ✅ Best Practice: Use `count()` with Separate Queries
Drizzle's `count()` function is type-safe and generates correct SQL. For complex counts involving other tables, run separate queries.

**✅ Use this pattern:**
```typescript
import { count, eq } from "drizzle-orm";

// 1. Fetch main entity
const app = await db.query.apps.findFirst({
  where: eq(apps.id, appId)
});

// 2. Fetch counts separately
const resourceCountResult = await db
  .select({ count: count() })
  .from(resources)
  .where(eq(resources.appId, appId));

const totalResources = resourceCountResult[0]?.count ?? 0;
```

### Why?
- **Stability**: Prevents runtime SQL syntax errors from malformed template strings.
- **Type Safety**: Using Drizzle's query builder ensures column names and types are correct.
- **Debugging**: Separate queries are easier to log and debug than complex nested SQL strings.
