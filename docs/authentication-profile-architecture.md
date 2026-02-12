# 认证配置（Authentication Profile）架构说明

- 最后审阅：2026-02-11
- 状态：已落地（Active）
- 范围：登录路由编排、基于 Profile 的 UI 渲染、服务端主认证方式拦截

## 1. 目标
`AuthenticationProfile` 是登录流程的单一契约（Single Source of Truth），用于统一控制：
1. 登录步骤与路由。
2. 页面可见的标识符（identifier）与认证方式（method）。
3. 服务端允许的主认证接口（未登录请求）。

## 2. 设计原则
1. Profile 只在服务端解析（`AUTHENTICATION_PROFILE`），客户端只消费安全子集。
2. 路由保持稳定，行为通过 Profile 配置变化，不通过增殖路由实现。
3. 路由匹配与拦截逻辑集中在 helper 中，避免散落在页面组件。
4. 对被禁用方式返回通用错误，避免泄露账号或策略细节。

## 3. Profile 契约（来源：`src/config/authentication/types.ts`）
1. `flow`：`singleScreen` 或 `identifierFirst`。
2. `pages`：`identify` / `method` / `twoFactor` / `biometric`（可选）。
3. `identify`：支持的标识符、默认标识符、反枚举文案、社交入口位置。
4. `authenticate`：允许的主认证方式、首选方式、方式所需标识符、可选 passkey 自动尝试策略。
5. `mfa`：MFA 策略、允许因子、触发主方式、可跳过主方式。
6. `biometric`：是否启用独立 passkey 页面、成功后行为、失败回退策略。
7. `server`：认证基路径、允许主方式、方式到 endpoint 的路径匹配规则、callback 放行策略。

## 4. 运行时边界
1. 服务端解析：`src/config/authentication/resolve.ts`
- 读取 `AUTHENTICATION_PROFILE`。
- 同时支持“注册表 key”与“profile.id”。
- 无效值回退到 `PROFILE_IDENTIFIER_FIRST_EMAIL` 并记录 warning。

2. 客户端安全投影：`src/config/authentication/client.ts`
- 使用 `toClientAuthenticationProfile(...)` 去除不可序列化的正则映射。
- 仅向页面组件暴露必要字段。

3. 配置注册表：`src/config/authentication/profiles.ts`
- 维护所有 profile 变体。
- 集中定义共享 pages、method-path 映射、默认 MFA 策略。

## 5. 规范路由拓扑
1. 识别步骤：`/auth/sign-in`
- 所有 profile 的统一入口。
- `singleScreen`：直接渲染登录表单方式。
- `identifierFirst`：先采集 identifier，再进入 biometric/method。

2. 方式步骤：`/auth/sign-in/method`
- 仅展示 profile 允许且与 identifier 兼容的方式。
- 支持配置化的一次性 passkey 自动尝试。

3. 生物识别步骤（可选）：`/auth/sign-in/biometric`
- 用于独立 passkey 页面场景。
- 自动尝试 passkey，失败时按策略回退到 method。

4. MFA 步骤：`/auth/sign-in/two-factor`
- 统一二次验证入口。
- 按 profile 渲染可用因子标签页。

5. 兼容重定向：
- `/auth/two-factor` -> `/auth/sign-in/two-factor`
- `/auth/two-factor/otp` -> `/auth/sign-in/two-factor?factor=emailOtp`

## 6. 步骤组件职责
1. `src/app/auth/sign-in/_components/sign-in.tsx`
- 在 `singleScreen` 与 `identifierFirst` 间分支。

2. `src/app/auth/sign-in/_components/sign-in-identify-step.tsx`
- 采集 identifier 与 remember-me。
- 归一化输入并构造下一步 URL 上下文。

3. `src/app/auth/sign-in/_components/sign-in-method-step.tsx`
- 计算“方式可用性（配置 + identifier 兼容）”。
- 条件展示 passkey / social / 表单方式。

4. `src/app/auth/sign-in/_components/sign-in-biometric-step.tsx`
- 执行独立 passkey 认证与失败回退。

5. `src/app/auth/sign-in/_components/sign-in-two-factor-step.tsx`
- 根据 profile 因子渲染 `totp` / `emailOtp` / `backupCode`。

## 7. 服务端拦截流程
拦截位于 `src/lib/auth.ts` 的 `hooks.before`，依赖 `src/config/authentication/enforcement.ts`。

1. 每次请求解析 active profile。
2. 仅对主登录流路径做 method 匹配（`isPrimarySignInFlowPath`）。
3. 将路径映射到主认证方式（`findAuthenticationMethodForPath`）。
4. 校验请求的 2FA 验证因子是否在 profile 的 `mfa.factors` 中。
5. 结合 `isAuthCallbackPath` 与 `server.allowCallbacks` 处理 callback。
6. 对未登录请求校验 `server.allowedPrimaryMethods`。
7. 对不支持的 MFA 触发组合直接拦截（防配置冲突）。
8. 返回通用安全错误文案。

## 8. MFA 与方式语义
1. 主认证方式：`password`、`passkey`、`emailOtp`、`smsOtp`、`magicLink`、`social`。
2. MFA 因子：`totp`、`backupCode`、`emailOtp`。
3. `smsOtp` 当前被建模为“主认证方式”，不是 MFA 因子类型。
4. 共享默认 MFA（`MFA_DEFAULT`）：
- `policy: ifUserEnabled`
- `factors: [totp, backupCode]`
- `triggerOnPrimary: [password]`
- `skipIfPrimaryIn: [passkey]`

## 9. 客户端集成要点
1. Better Auth 二次验证重定向目标已统一到 `/auth/sign-in/two-factor`（`src/lib/auth-client.ts`）。
2. Step1 社交入口位置会联动 One Tap 是否展示（`sign-in-page-client.tsx`）。
3. `src/components/forms/sign-in-form.tsx` 支持按 profile 约束可用方式、identifier 标签与固定 identifier。

## 10. 运行约束
1. `server.methodToPaths` 必须与真实 Better Auth endpoint 保持同步。
2. 路径匹配有长度保护（`MAX_AUTH_PATH_LENGTH = 512`），且正则测试前会重置状态。
3. callback 是否可通过由 profile 控制；禁用 callback 会影响社交回调链路。
4. “passkey 成功后是否跳过 MFA”受 profile 与 Better Auth 运行时共同影响，策略变更后需做环境级 E2E 验证。

## 11. 非目标
1. 不引入 v1/v2 路由并行体系。
2. 不为该能力新增重型依赖。
3. 不改造登录流之外的账户管理功能。
