# Better-Auth 认证核心概念研究报告

## 1. 概述

本报告基于官方文档，详细拆解了 Better-Auth 中关于 **User (用户)**, **Session (会话)**, **Account (账户)** 和 **OAuth** 等核心认证模块的组成部分。

报告旨在回答：认证这一块具体分为哪些内容？涉及哪些资源、操作（Actions）和主题（Topics）？

## 2. 核心模块划分

我们将认证核心分为以下三大块：

1.  **用户与账户管理 (User & Account Management)**
2.  **会话管理 (Session Management)**
3.  **社会化登录 (OAuth / Social Login)**

---

### 2.1 用户与账户管理 (User & Account Management)

此模块负责用户的生命周期管理和账户链接。

#### 关键资源 (Resources)
*   **User**: 用户的核心身份信息 (Profile)。
*   **Account**: 用户关联的登录凭证 (密码、OAuth 链接等)。
*   **Verification Token**: 用于邮箱验证、密码重置的临时凭证（包含 token, expiresAt, value 等）。

#### 关键操作 (Actions) - 客户端与服务端
*   **Update User**:
    *   `updateUser`: 更新基本信息（姓名、头像等）。
    *   `changeEmail`: 修改邮箱流程（含新旧邮箱验证）。
*   **Password Management**:
    *   `changePassword`: 用户修改密码（可选择撤销其他会话）。
    *   `setPassword`: 为无密码用户（如仅 OAuth 注册）设置密码。
    *   `verifyPassword`: 验证当前密码（用于敏感操作前的二次确认）。
*   **Delete User**:
    *   `deleteUser`: 永久删除用户。支持验证流程（密码验证、邮箱验证码验证）。
*   **Account Linking (多账号绑定)**:
    *   `linkSocial`: 将当前登录用户关联到新的 OAuth 提供商。
    *   `unlinkAccount`: 解除某个 OAuth 提供商的关联。
    *   `listAccounts`: 列出当前用户所有关联的账户。

#### 关键主题 (Topics)
*   **Email Verification for Updates**: 修改邮箱时的安全验证机制（验证旧邮箱 -> 验证新邮箱）。
*   **Timing Attacks**: 邮件发送时的安全考量。
*   **Soft vs Hard Delete**: 默认支持硬删除，提供 `beforeDelete` 和 `afterDelete` 钩子用于清理关联数据。
*   **Token Encryption**: Account 表中的 Token (`accessToken`, `refreshToken`) 默认不加密，支持通过 `databaseHooks` 实施自定义加密。

---

### 2.2 会话管理 (Session Management)

此模块负责用户登录后的状态维持和安全性。

#### 关键资源 (Resources)
*   **Session**: 存储在数据库和 Cookie 中的会话记录。
    *   关键字段: `token`, `userId`, `expiresAt`, `ipAddress`, `userAgent`。
*   **Cookie**: 客户端存储介质。

#### 关键操作 (Actions)
*   **Retrieval**:
    *   `getSession`: 获取当前会话信息（无指纹校验）。
    *   `useSession`: 客户端 Hook，响应式获取会话。
    *   `listSessions`: 列出当前用户的所有活跃会话（多设备）。
*   **Revocation (注销)**:
    *   `revokeSession`: 注销指定会话（登出）。
    *   `revokeOtherSessions`: 注销除当前设备外的所有其他会话。
    *   `revokeSessions`: 注销该用户所有会话（踢下线）。

#### 关键主题 (Topics)
*   **Session Database vs Stateless**:
    *   **Database Session**: 默认模式，Session 存库，安全性高，易于管理（可撤销）。
    *   **Stateless Session (JWT/JWE)**: 无数据库模式，依赖签名/加密 Cookie。
*   **Session Freshness (新鲜度)**:
    *   某些敏感操作要求 `fresh` session（即用户刚刚登录）。
*   **Cookie Caching**:
    *   为了性能，减少数据库查询，支持在客户端 Cookie 中缓存 Session 数据。
    *   策略：`compact` (Base64), `jwt` (标准), `jwe` (加密)。
*   **Secondary Storage**:
    *   支持使用 Redis 等二级缓存存储 Session，减轻主数据库压力。

---

### 2.3 社会化登录 (OAuth)

此模块处理第三方身份提供商的集成。

#### 关键资源 (Resources)
*   **Social Provider**: Google, GitHub, Facebook 等外部身份源。
*   **OAuth Tokens**: Access Token, Refresh Token, ID Token。

#### 关键操作 (Actions)
*   **Sign In**:
    *   `signIn.social`: 启动 OAuth 登录流程。
*   **Linking**:
    *   `linkSocial`: (同上，属于 Account 管理的一部分)。
*   **Token Management**:
    *   `getAccessToken`: 获取提供商的 Access Token（会自动刷新）。
    *   `accountInfo`: 获取提供商侧的用户原始信息。

#### 关键主题 (Topics)
*   **Scopes**:
    *   **Initial Scope**: 登录时请求的基础权限。
    *   **Incremental Scope**: 登录后请求额外的权限（如请求 Google Drive 访问权）。
*   **Implicit Sign-up**: 默认 OAuth 登录会自动注册新用户，可配置禁用。
*   **Metadata flow**: 在 OAuth 流程中传递 `additionalData`（如邀请码、来源追踪），并通 Hook 获取。
*   **ID Token Support**: 支持直接使用移动端或 SDK 获取的 `idToken` 进行验证登录。

### 2.4 安全基础设施与辅助流程 (Security Infrastructure & Auxiliary Flows)

此模块涵盖认证系统的底层安全机制和辅助验证流程。

#### A. Cookies 管理
Better-Auth 严重依赖 Cookies 存储会话和 OAuth 状态。
*   **安全机制**:
    *   **Signed Cookies**: 所有 Cookie 均使用密钥签名，防止篡改。
    *   **Secure & HttpOnly**: 生产环境下默认开启，防止 XSS 和中间人攻击。
    *   **Prefix**: 默认前缀 `better-auth.`，支持自定义。
*   **高级配置**:
    *   **Cross Subdomain**: 支持跨子域名共享 Cookie（如 `auth.example.com` 登录，`app.example.com` 共享状态）。

#### B. 邮件流程 (Email Flows)
除核心登录外，邮件是重要的账户安全辅助工具。
*   **Email Verification (邮箱验证)**:
    *   **触发时机**: 注册时自动触发、登录时强制要求、或 API 手动触发。
    *   **流程**: 生成 Token -> 发送邮件 (`sendVerificationEmail` hook) -> 用户点击链接 -> `verifyEmail` API 验证。
    *   **策略**: 支持 `autoSignInAfterVerification`（验证后自动登录）。
*   **Password Reset (密码重置)**:
    *   **流程**: 用户请求重置 -> 发送邮件 (`sendResetPassword` hook) -> 用户点击链接 -> `resetPassword` API 设置新密码。

#### C. 速率限制 (Rate Limiting)
内置的防暴力破解和防滥用机制。
*   **默认策略**: 100 次请求 / 60 秒 (针对客户端 API)。
*   **高级规则**:
    *   可针对特定路径（如 `/sign-in/email`）设置更严格的限制。
    *   支持插件自定义规则（如 `twoFactor` 插件默认限制验证接口）。
*   **存储后端**:
    *   **Memory**: 默认，不适合 Serverless 或多实例。
    *   **Database/Redis**: 生产环境推荐，支持持久化和分布式计数。
*   **客户端处理**: 响应头包含 `X-Retry-After`，客户端 SDK 支持全局或单次请求的错误处理回调。

### 2.5 认证策略与提供商 (Authentication Providers & Strategies)
Better-Auth 支持多种认证策略，最核心的是邮箱密码和 OAuth。

#### A. 邮箱与密码 (Email & Password / Credentials)
传统的账号密码登录方式。
*   **启用**: 需显式配置 `emailAndPassword: { enabled: true }`。
*   **核心流程**:
    *   **Sign Up**: 收集用户信息 -> 密码哈希 (`scrypt` 默认，可切 `argon2`) -> 创建 User & Account -> (可选) 发送验证邮件。
    *   **Sign In**: 验证邮箱密码 -> 创建 Session。
    *   **Password Management**: 重置密码流程强依赖邮件模块。
*   **安全特性**:
    *   **Hashing**: 默认使用 scrypt，Node.js 原生支持，抗暴力破解。
    *   **Rate Limit**: 建议对 `/sign-in/email` 开启严格速率限制。

#### B. 社会化登录 (Social / OAuth)
通过第三方身份提供商登录。
*   **配置**:
    *   每个 Provider 需 `clientId` 和 `clientSecret`。
    *   **Scopes**: 默认请求 `email` 和 `profile`。GitHub 等需注意配置 app 权限以获取 email。
*   **流程**:
    *   用户点击 Social Login -> 重定向至 Provider -> 用户授权 -> 回调 Better-Auth -> 创建/查找 User & Account -> 创建 Session。
*   **特性**:
    *   **Account Linking**: 自动将相同邮箱的 OAuth 账号关联到同一 User（需配置）。
    *   **Refresh Token**: 对于 Google 等支持刷新 Token 的提供商，Better-Auth 会自动处理 Access Token 刷新。GitHub 等 OAuth App 不提供 Refresh Token。

### 2.6 管理员插件与访问控制 (Admin Plugin & Access Control)
Admin 插件扩展了基础认证系统，提供了用户管理和 RBAC 能力。

#### A. 数据库模式扩展 (Schema Extensions)
*   **User Table**:
    *   `role`: 角色字段 (默认 `user` / `admin`)，支持多角色（逗号分隔）。
    *   `banned`: 封禁状态。
    *   `banReason`: 封禁原因。
    *   `banExpires`: 封禁过期时间。
*   **Session Table**:
    *   `impersonatedBy`: 记录发起模仿登录的管理员 ID。

#### B. 核心管理操作 (Admin Actions)
*   **User Lifecycle (用户生命周期)**:
    *   `createUser`: 管理员直接创建用户。
    *   `listUsers`: 支持搜索、过滤、排序和分页的用户列表。
    *   `updateUser` / `removeUser`: 编辑或硬删除用户。
    *   `banUser` / `unbanUser`: 封禁/解封用户（封禁会同时撤销所有 Session）。
*   **Security & Access (安全与权限)**:
    *   `setRole`: 分配用户角色。
    *   `setUserPassword`: 强制重置用户密码。
    *   **Impersonation (模仿登录)**: 管理员以特定用户身份登录 (`impersonateUser`)，Session 包含 `impersonatedBy` 标记，可随时中止 (`stopImpersonating`)。
*   **Session Management (会话管理)**:
    *   `listUserSessions`: 查看指定用户的所有活跃会话。
    *   `revokeUserSession` / `revokeUserSessions`: 撤销指定或所有会话。

#### C. 访问控制 (RBAC)
*   **Default Roles**: `admin` (全权), `user` (无管理权).
*   **Custom Roles**: 通过 `createAccessControl` 定义细粒度权限（如 `project: ["create"]`）。
*   **Permission Checks**:
    *   `hasPermission`: 检查当前用户权限。
    *   `userHasPermission`: 检查指定用户权限。
    *   `checkRolePermission`: 检查特定角色定义的权限（静态检查）。

## 3. 总结架构图

    subgraph "Core Resources"
        User[User]
        Account[Account]
        Session[Session]
        VToken[Verification Token]
    end

    subgraph "Infrastructure"
        Cookie[Signed/Secure Cookies]
        RateLimit[Rate Limiter]
        EmailSvc[Email Service]
    end

    subgraph "Actions"
        direction TB
        subgraph "User & Account Actions"
            Update[updateUser / changeEmail]
            Pwd[changePassword / setPassword]
            Del[deleteUser]
            Link[linkSocial / unlinkAccount]
        end

        subgraph "Session Actions"
            GetSess[getSession / listSessions]
            Revoke[revokeSession / revokeOther]
        end

        subgraph "Auth Actions"
            SignIn[signIn]
            GetToken[getAccessToken]
        end
        
        subgraph "Admin Actions"
            AdminUser[create/list/ban User]
            AdminSess[revoke User Session]
            Impersonate[impersonateUser]
        end
    end

    %% Resource Relationships
    User --> Account
    User --> Session
    User --> VToken
    
    %% Action Flows
    Update --> User
    Update -.-> EmailSvc
    
    Pwd --> Account
    Pwd -.-> EmailSvc
    
    Link --> Account
    Del --> User
    
    GetSess --> Session
    Revoke --> Session
    
    SignIn --> Account
    SignIn --> Session
    GetToken --> Account

    AdminUser --> User
    AdminSess --> Session
    Impersonate --> Session

    %% Infrastructure Dependencies
    User -.-> RateLimit
    Session -.-> Cookie

