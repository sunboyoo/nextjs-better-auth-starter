## Options

**allowUserToCreateOrganization**: `boolean` | `((user: User) => Promise<boolean> | boolean)` - A function that determines whether a user can create an organization. By default, it's `true`. You can set it to `false` to restrict users from creating organizations.

**organizationLimit**: `number` | `((user: User) => Promise<boolean> | boolean)` - The maximum number of organizations allowed for a user. By default, it's `unlimited`. You can set it to any number you want, or a function that returns a boolean. **If you provide a function, it should return `true` if the user has reached their organization limit (blocking further creation), or `false` if they have not reached their limit (allowing further creation).**

**creatorRole**: `admin | owner` - The role of the user who creates the organization. By default, it's `owner`. You can set it to `admin`.

**membershipLimit**: `number` - The maximum number of members allowed in an organization. By default, it's `100`. You can set it to any number you want.

**sendInvitationEmail**: `async (data) => Promise<void>` - A function that sends an invitation email to the user.

**invitationExpiresIn** : `number` - How long the invitation link is valid for in seconds. By default, it's 48 hours (2 days).

**cancelPendingInvitationsOnReInvite**: `boolean` - Whether to cancel pending invitations if the user is already invited to the organization. By default, it's `false`.

**invitationLimit**: `number` | `((user: User) => Promise<boolean> | boolean)` - The maximum number of invitations allowed for a user. By default, it's `100`. You can set it to any number you want or a function that returns a boolean.

**requireEmailVerificationOnInvitation**: `boolean` - Whether to require email verification before accepting or rejecting invitations. By default, it's `false`. When enabled, users must have verified their email address before they can accept or reject organization invitations.