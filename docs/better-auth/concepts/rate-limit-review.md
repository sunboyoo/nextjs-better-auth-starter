# Better Auth Concepts Rate Limit 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/concepts/rate-limit.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 合规（并补齐生产可观测性与落地路径）。
- 已具备 Better Auth 全局限流 + Phone OTP 细粒度节流 + 运行期配置告警 + 共享 secondary storage 接入能力。

## 2. 已实现能力

1. 全局 `rateLimit`（enabled/window/max/storage）支持环境变量驱动。
2. Phone OTP 针对 IP 与手机号双桶限流。
3. 支持 memory/database/secondary-storage（含 secondary-storage 配置缺失回退与告警）。
4. `secondary-storage` 已支持 `upstash-redis` 共享存储实现（REST API）。
5. 已补充 `rate_limit` 表结构，支持数据库限流存储落地。
6. 已增加运行期告警：
   - 生产环境使用内存限流存储时告警。
   - `secondary-storage` 已声明但未配置 backend 时告警。
7. 客户端已记录 429 限流事件（含 `X-Retry-After`）以便排障。

## 3. 风险与差距

1. 共享存储能力已提供，但生产仍需实际配置并验证 Redis 可用性与网络连通性。
2. 已有日志可观测性，但尚未接入集中式指标平台（如 Prometheus/Datadog）做趋势分析。

## 4. 代码证据

- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/db/schema.ts`
- `scripts/validate-auth-env.ts`
- `.github/workflows/auth-guardrails.yml`

## 5. 建议

1. 生产环境优先使用 `database` 或共享 `secondary-storage`，并在部署侧启用连通性巡检。
2. 将限流日志接入统一监控平台，按路径统计 429 命中率与 `retry-after` 分布。
