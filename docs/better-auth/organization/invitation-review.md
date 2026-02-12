# Better Auth Organization Invitation 审查报告

- 本轮复核日期：2026-02-12
- 官方文档：`docs/better-auth/organization/invitations.md`
- 官方索引：`docs/better-auth/llms.txt`

## 1. 结论

- 合规等级：✅ 合规（功能完整）。
- 邀请发送、列表、重发、取消、接受、拒绝在用户态与管理态均已可用。

## 2. 已实现能力

1. `sendInvitationEmail` 与邀请有效期配置已启用。
2. 管理端可列表/创建（含 resend）/取消邀请。
3. 用户可在邀请详情页和 Dashboard 邀请卡片中接受或拒绝。
4. 已启用 `requireEmailVerificationOnInvitation`。
5. 管理端邀请列表已按 `createdAt` 排序，且 `createdAt` 与 `expiresAt` 字段语义已分离。

## 3. 主要差距与风险

1. 管理员必须先是组织成员才可发邀/撤邀（符合当前实现约束，但需产品层认知）。

## 4. 代码证据

- `src/lib/auth.ts`
- `src/app/api/admin/organizations/[organizationId]/invitations/route.ts`
- `src/app/api/admin/organizations/[organizationId]/invitations/[invitationId]/route.ts`
- `src/app/auth/accept-invitation/[id]/page.tsx`
- `src/app/dashboard/_components/dashboard-home/user-invitations-card.tsx`
- `src/app/dashboard/_components/dashboard-home/active-organization-card.tsx`

## 5. 建议

1. 补齐邀请流端到端回归（含 resend、cancel、accept、reject、分页过滤）。
2. 在后台文案中显式说明“需先成为组织成员才能管理邀请”。
