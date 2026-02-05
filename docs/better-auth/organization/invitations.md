## Invitations

To add a member to an organization, we first need to send an invitation to the user. The user will receive an email/sms with the invitation link. Once the user accepts the invitation, they will be added to the organization.

### Setup Invitation Email

For member invitation to work we first need to provide `sendInvitationEmail` to the `better-auth` instance. This function is responsible for sending the invitation email to the user.

You'll need to construct and send the invitation link to the user. The link should include the invitation ID, which will be used with the acceptInvitation function when the user clicks on it.

```ts title="auth.ts"
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { sendOrganizationInvitation } from "./email";
export const auth = betterAuth({
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        const inviteLink = `https://example.com/accept-invitation/${data.id}`;
        sendOrganizationInvitation({
          email: data.email,
          invitedByUsername: data.inviter.user.name,
          invitedByEmail: data.inviter.user.email,
          teamName: data.organization.name,
          inviteLink,
        });
      },
    }),
  ],
});
```

### Send Invitation

To invite users to an organization, you can use the `invite` function provided by the client. The `invite` function takes an object with the following properties:


### Client Side

```ts
const { data, error } = await authClient.organization.inviteMember({
    email: example@gmail.com,
    role: member,
    organizationId: org-id, // optional
    resend, // optional
    teamId: team-id, // optional
});
```

### Server Side

```ts
const data = await auth.api.createInvitation({
    body: {
        email: example@gmail.com,
        role: member,
        organizationId: org-id, // optional
        resend, // optional
        teamId: team-id, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type createInvitation = {
      /**
       * The email address of the user to invite.  
       */
      email: string = "example@gmail.com"
      /**
       * The role(s) to assign to the user. It can be `admin`, `member`, `owner`
       */
      role: string | string[] = "member"
      /**
       * The organization ID to invite the user to. Defaults to the active organization.  
       */
      organizationId?: string = "org-id"
      /**
       * Resend the invitation email, if the user is already invited.  
       */
      resend?: boolean = true
      /**
       * The team ID to invite the user to.  
       */
      teamId?: string = "team-id"
  
}
```


<Callout>
  * If the user is already a member of the organization, the invitation will be
    canceled. - If the user is already invited to the organization, unless
    `resend` is set to `true`, the invitation will not be sent again. - If
    `cancelPendingInvitationsOnReInvite` is set to `true`, the invitation will be
    canceled if the user is already invited to the organization and a new
    invitation is sent.
</Callout>

### Accept Invitation

When a user receives an invitation email, they can click on the invitation link to accept the invitation. The invitation link should include the invitation ID, which will be used to accept the invitation.

Make sure to call the `acceptInvitation` function after the user is logged in.


### Client Side

```ts
const { data, error } = await authClient.organization.acceptInvitation({
    invitationId: invitation-id,
});
```

### Server Side

```ts
const data = await auth.api.acceptInvitation({
    body: {
        invitationId: invitation-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type acceptInvitation = {
      /**
       * The ID of the invitation to accept.  
       */
      invitationId: string = "invitation-id"
  
}
```


#### Email Verification Requirement

If the `requireEmailVerificationOnInvitation` option is enabled in your organization configuration, users must verify their email address before they can accept invitations. This adds an extra security layer to ensure that only verified users can join your organization.

```ts title="auth.ts"
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    organization({
      requireEmailVerificationOnInvitation: true, // [!code highlight]
      async sendInvitationEmail(data) {
        // ... your email sending logic
      },
    }),
  ],
});
```

### Cancel Invitation

If a user has sent out an invitation, you can use this method to cancel it.

If you're looking for how a user can reject an invitation, you can find that [here](#reject-invitation).


### Client Side

```ts
const { data, error } = await authClient.organization.cancelInvitation({
    invitationId: invitation-id,
});
```

### Server Side

```ts
await auth.api.cancelInvitation({
    body: {
        invitationId: invitation-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type cancelInvitation = {
      /**
       * The ID of the invitation to cancel.  
       */
      invitationId: string = "invitation-id"
  
}
```


### Reject Invitation

If this user has received an invitation, but wants to decline it, this method will allow you to do so by rejecting it.


### Client Side

```ts
const { data, error } = await authClient.organization.rejectInvitation({
    invitationId: invitation-id,
});
```

### Server Side

```ts
await auth.api.rejectInvitation({
    body: {
        invitationId: invitation-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type rejectInvitation = {
      /**
       * The ID of the invitation to reject.  
       */
      invitationId: string = "invitation-id"
  
}
```


<Callout type="info">
  Like accepting invitations, rejecting invitations also requires email
  verification when the `requireEmailVerificationOnInvitation` option is
  enabled. Users with unverified emails will receive an error when attempting to
  reject invitations.
</Callout>

### Get Invitation

To get an invitation you can use the `organization.getInvitation` function provided by the client. You need to provide the invitation id as a query parameter.


### Client Side

```ts
const { data, error } = await authClient.organization.getInvitation({
    id: invitation-id,
});
```

### Server Side

```ts
const data = await auth.api.getInvitation({
    query: {
        id: invitation-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type getInvitation = {
      /**
       * The ID of the invitation to get.  
       */
      id: string = "invitation-id"
  
}
```


### List Invitations

To list all invitations for a given organization you can use the `listInvitations` function provided by the client.


### Client Side

```ts
const { data, error } = await authClient.organization.listInvitations({
    organizationId: organization-id, // optional
});
```

### Server Side

```ts
const data = await auth.api.listInvitations({
    query: {
        organizationId: organization-id, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type listInvitations = {
      /**
       * An optional ID of the organization to list invitations for. If not provided, will default to the user's active organization. 
       */
      organizationId?: string = "organization-id"
  
}
```


### List user invitations

To list all invitations for a given user you can use the `listUserInvitations` function provided by the client.

```ts title="auth-client.ts"
const invitations = await authClient.organization.listUserInvitations();
```

On the server, you can pass the user ID as a query parameter.

```ts title="api.ts"
const invitations = await auth.api.listUserInvitations({
  query: {
    email: "user@example.com",
  },
});
```

<Callout type="warn">
  The `email` query parameter is only available on the server to query for
  invitations for a specific user.
</Callout>
