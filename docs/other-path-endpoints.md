# Other Paths Endpoint Inventory

## Scope
All `src/**` paths excluding `src/app/dashboard/**` and `src/app/admin/**`.

## Extraction Notes
- Includes endpoint URL literals found in request/config contexts (`fetch`, SWR keys, `url:` request params, and auth/API config fields).
- Dynamic placeholders are normalized to canonical parameter names (for example `${applicationId}`, `${resourceId}`, `${actionId}`).

## Direct Endpoint Patterns (18)

### `/api/admin/users`
- `src/utils/auth.ts:104`

### `/api/admin/users/${userId}`
- `src/utils/auth.ts:123`
- `src/utils/auth.ts:135`
- `src/utils/auth.ts:156`
- `src/utils/auth.ts:218`
- `src/utils/auth.ts:48`
- `src/utils/auth.ts:61`
- `src/utils/auth.ts:72`

### `/api/admin/users/${userId}/sessions`
- `src/utils/auth.ts:80`

### `/api/admin/users/${userId}/trigger-email-change-verification`
- `src/utils/auth.ts:198`

### `/api/admin/users/send-verification-email`
- `src/utils/auth.ts:185`

### `/api/admin/users/set-password`
- `src/utils/auth.ts:209`

### `/api/auth`
- `src/config/authentication/profiles.ts:103`
- `src/config/authentication/profiles.ts:137`
- `src/config/authentication/profiles.ts:178`
- `src/config/authentication/profiles.ts:212`
- `src/config/authentication/profiles.ts:242`
- `src/config/authentication/profiles.ts:272`
- `src/config/authentication/profiles.ts:304`
- `src/config/authentication/profiles.ts:336`
- `src/config/authentication/profiles.ts:366`
- `src/config/authentication/profiles.ts:407`
- `src/config/authentication/profiles.ts:447`
- `src/config/authentication/profiles.ts:485`
- `src/config/authentication/types.ts:76`

### `/api/auth/`
- `src/lib/public-paths.ts:13`

### `/api/auth/.well-known/oauth-authorization-server`
- `src/app/.well-known/oauth-authorization-server/route.ts:5`

### `/api/auth/.well-known/openid-configuration`
- `src/app/.well-known/openid-configuration/route.ts:5`

### `/api/auth/jwks`
- `src/app/api/mcp/route.ts:14`

### `/api/auth/oauth2/register`
- `src/app/api/auth/[...all]/route.ts:12`

### `/api/auth/oauth2/token`
- `src/app/api/auth/[...all]/route.ts:10`

### `/api/auth/oauth2/userinfo`
- `src/app/api/auth/[...all]/route.ts:11`

### `/api/mcp`
- `src/app/api/mcp/route.ts:16`
- `src/lib/auth.ts:2047`
- `src/lib/public-paths.ts:10`

### `/api/mcp/`
- `src/lib/public-paths.ts:13`

### `http://localhost:3000`
- `src/app/api/mcp/route.ts:10`

### `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
- `src/app/api/auth/webhook/phone-otp/route.ts:209`
