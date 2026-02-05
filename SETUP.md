# Better Auth Starter - 快速设置指南

下载此 Starter 模板后，按照以下步骤完成配置。

---

## 前置要求

- Node.js 18+
- pnpm（推荐）
- PostgreSQL 数据库（推荐使用 [Supabase](https://supabase.com)）
- [Resend](https://resend.com) 账户（用于发送邮件）

---

## 设置步骤

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制示例配置文件：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，配置以下变量：

```env
# Better Auth 配置
BETTER_AUTH_SECRET=<生成一个随机字符串>
BETTER_AUTH_URL=http://localhost:3000

# OAuth 提供商（可选，如不需要可保留默认值）
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# 数据库连接
DATABASE_URL="postgresql://用户名:密码@主机:端口/数据库名"

# Resend 邮件配置
RESEND_API_KEY=re_xxxxxxxx
RESEND_EMAIL_FROM="no-reply@your-verified-domain.com"
```

### 3. 配置 Resend 邮件服务

1. 登录 [Resend 控制台](https://resend.com)
2. 添加并验证您的域名
3. 确保以下 DNS 记录状态为 **Verified**：
   - DKIM 记录
   - SPF 记录（MX 和 TXT）
4. 创建 API Key 并填入 `RESEND_API_KEY`
5. 将 `RESEND_EMAIL_FROM` 设置为您验证过的域名邮箱

> ⚠️ **重要**：`RESEND_EMAIL_FROM` 必须使用您在 Resend 中验证过的域名，否则邮件发送会失败！

### 4. 修改邮件发送代码

模板中 `src/lib/email.ts` 的发件人地址是硬编码的，需要修改为使用环境变量。

将第 12 行：

```typescript
from: "Better Auth Starter <no-reply@example.com>",
```

改为：

```typescript
from: process.env.RESEND_EMAIL_FROM || "onboarding@resend.dev",
```

### 5. 运行数据库迁移

```bash
pnpm db:migrate
```

这会在数据库中创建以下表：
- `user` - 用户表
- `session` - 会话表
- `account` - 账户表（用于 OAuth）
- `verification` - 邮箱验证表

### 6. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000 即可使用！

---

## 常见问题

### 注册时显示 "Something went wrong"

**原因 1**：`RESEND_EMAIL_FROM` 使用了未验证的域名

解决方案：确保使用您在 Resend 控制台中已验证的域名。

**原因 2**：数据库表未创建

解决方案：运行 `pnpm db:migrate`

### 数据库迁移失败

如果 `pnpm db:migrate` 报错 `url: undefined`，请确保：
1. `.env.local` 文件存在
2. `DATABASE_URL` 变量格式正确

---

## 可用脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 运行生产服务器 |
| `pnpm lint` | 运行 ESLint |
| `pnpm db:generate` | 生成数据库迁移 |
| `pnpm db:migrate` | 运行数据库迁移 |
| `pnpm db:push` | 推送 Schema 到数据库 |
| `pnpm db:studio` | 打开 Drizzle Studio |

---

## 下一步

- [ ] 配置 OAuth 登录（Google、GitHub）
- [ ] 自定义邮件模板
- [ ] 部署到 Vercel
