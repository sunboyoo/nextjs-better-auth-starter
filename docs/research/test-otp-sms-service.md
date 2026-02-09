# 测试专用 OTP 短信服务（Twilio Test Credentials）

## 目标

该服务用于测试环境，完整模拟生产短信下发链路（Webhook 入站、鉴权、参数校验、供应商请求、结构化日志、错误返回），但将 OTP 固定为 `000000`，用于稳定、可重复的端到端自动化测试。

实现入口：

- `src/app/api/auth/webhook/phone-otp/route.ts`

## 配置

在 `.env` 中配置以下变量：

```dotenv
BETTER_AUTH_PHONE_OTP_WEBHOOK_URL=http://localhost:3000/api/auth/webhook/phone-otp
BETTER_AUTH_PHONE_OTP_WEBHOOK_AUTH_TOKEN=your-strong-random-webhook-token

# 测试模式：强制 OTP 固定值
BETTER_AUTH_PHONE_OTP_SERVICE_MODE=twilio-test-fixed-otp
BETTER_AUTH_PHONE_OTP_FIXED_TEST_CODE=000000

# Twilio Test Credentials + Magic Numbers
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15005550006
```

> 说明：`twilio-test-fixed-otp` 模式下：
> 1) Webhook 入参里的 `code` 会被替换成 `BETTER_AUTH_PHONE_OTP_FIXED_TEST_CODE`（短信发送侧）。
> 2) Better Auth 服务端校验也会接受该固定值（校验侧）。
>
> 两侧同时固定，才能避免出现“短信里是 000000，但校验仍按随机 OTP”的 `Invalid OTP`。

## Webhook 入参

服务接收 Better Auth OTP webhook JSON：

```json
{
  "phoneNumber": "+14155551234",
  "code": "123456",
  "type": "verification"
}
```

其中 `type` 支持：

- `verification`
- `password-reset`

## 返回结构（与生产一致的可观测形态）

### 成功（200）

```json
{
  "ok": true,
  "requestId": "4f3d8f34-8b4d-4e0e-85b0-2c0d35736f91",
  "provider": "twilio",
  "mode": "twilio-test-fixed-otp",
  "delivery": {
    "accepted": true,
    "providerMessageId": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "providerStatus": "queued"
  },
  "otp": {
    "type": "verification",
    "codeStrategy": "fixed-test-code"
  }
}
```

### 失败（示例，502）

```json
{
  "ok": false,
  "requestId": "4f3d8f34-8b4d-4e0e-85b0-2c0d35736f91",
  "error": {
    "code": "PROVIDER_DELIVERY_FAILED",
    "message": "Twilio request failed",
    "details": {
      "provider": "twilio",
      "providerStatus": 400,
      "providerErrorCode": 21608
    }
  }
}
```

## 日志与可观测性

路由会输出结构化日志：

- `accepted webhook`
- `provider delivery succeeded`
- `provider delivery failed`
- `provider request error`

日志中对手机号进行脱敏显示（仅保留前 3 位和后 3 位），并携带 `requestId`，便于串联链路。

## 替换为生产实现

后续切换生产服务时：

1. 将 `BETTER_AUTH_PHONE_OTP_SERVICE_MODE` 改为 `twilio-live`（或替换为你自己的 provider 实现）。
2. 保持 Webhook 入参、响应结构、日志字段和错误码风格不变，尽量做到“无缝替换”。
3. 保留 `requestId` 贯穿调用链，方便线上故障排查。
