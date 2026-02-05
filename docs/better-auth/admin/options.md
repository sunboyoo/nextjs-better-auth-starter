
## Options

### Default Role

The default role for a user. Defaults to `user`.

```ts title="auth.ts"
admin({
  defaultRole: "regular",
});
```

### Admin Roles

The roles that are considered admin roles when **not** using custom access control. Defaults to `["admin"]`.

```ts title="auth.ts"
admin({
  adminRoles: ["admin", "superadmin"],
});
```

<Callout type="warning">
  **Note:** The `adminRoles` option is **not required** when using custom access control (via `ac` and `roles`). When you define custom roles with specific permissions, those roles will have exactly the permissions you grant them through the access control system.

  **Warning:** When **not** using custom access control, any role that isn't in the `adminRoles` list will **not** be able to perform admin operations.
</Callout>

### Admin userIds

You can pass an array of userIds that should be considered as admin. Default to `[]`

```ts title="auth.ts"
admin({
    adminUserIds: ["user_id_1", "user_id_2"]
})
```

If a user is in the `adminUserIds` list, they will be able to perform any admin operation.

### impersonationSessionDuration

The duration of the impersonation session in seconds. Defaults to 1 hour.

```ts title="auth.ts"
admin({
  impersonationSessionDuration: 60 * 60 * 24, // 1 day
});
```

### Default Ban Reason

The default ban reason for a user created by the admin. Defaults to `No reason`.

```ts title="auth.ts"
admin({
  defaultBanReason: "Spamming",
});
```

### Default Ban Expires In

The default ban expires in for a user created by the admin in seconds. Defaults to `undefined` (meaning the ban never expires).

```ts title="auth.ts"
admin({
  defaultBanExpiresIn: 60 * 60 * 24, // 1 day
});
```

### bannedUserMessage

The message to show when a banned user tries to sign in. Defaults to "You have been banned from this application. Please contact support if you believe this is an error."

```ts title="auth.ts"
admin({
  bannedUserMessage: "Custom banned user message",
});
```

### allowImpersonatingAdmins

Whether to allow impersonating other admin users. Defaults to `false`.

```ts title="auth.ts"
admin({
  allowImpersonatingAdmins: true,
});
```

