## Organization

### Create an organization


### Client Side

```ts
const { data, error } = await authClient.organization.create({
    name: My Organization,
    slug: my-org,
    logo: https://example.com/logo.png, // optional
    metadata, // optional
    userId: some_user_id, // optional
    keepCurrentActiveOrganization, // optional
});
```

### Server Side

```ts
const data = await auth.api.createOrganization({
    body: {
        name: My Organization,
        slug: my-org,
        logo: https://example.com/logo.png, // optional
        metadata, // optional
        userId: some_user_id, // optional
        keepCurrentActiveOrganization, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type createOrganization = {
    /**
    * The organization name.
    */
    name: string = "My Organization"
    /**
    * The organization slug.
    */
    slug: string = "my-org"
    /**
    * The organization logo.
    */
    logo?: string = "https://example.com/logo.png"
    /**
    * The metadata of the organization.
    */
    metadata?: Record<string, any>
    /**
    * The user ID of the organization creator.
    * @serverOnly - This is ignored if session headers are provided.
    */
    userId?: string = "some_user_id"
    /**
    * Whether to keep the current active organization active after creating a new one.
    */
    keepCurrentActiveOrganization?: boolean = false
  
}
```


<Callout type="warn">
  **Mutually Exclusive Parameters**

  The `userId` and session headers cannot be used together:

  * **With session headers:** The organization is created for the authenticated session user. The `userId` field is **silently ignored**.
  * **Without session headers (Server-side only):** The organization is created for the user specified by `userId`.

  **For Admins:** To create an organization on behalf of another user, you must make the API call server-side **without** passing session headers.
</Callout>

#### Restrict who can create an organization

By default, any user can create an organization. To restrict this, set the `allowUserToCreateOrganization` option to a function that returns a boolean, or directly to `true` or `false`.

```ts title="auth.ts"
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";

const auth = betterAuth({
  //...
  plugins: [
    organization({
      allowUserToCreateOrganization: async (user) => {
        // [!code highlight]
        const subscription = await getSubscription(user.id); // [!code highlight]
        return subscription.plan === "pro"; // [!code highlight]
      }, // [!code highlight]
    }),
  ],
});
```

#### Check if organization slug is taken

To check if an organization slug is taken or not you can use the `checkSlug` function provided by the client. The function takes an object with the following properties:


### Client Side

```ts
const { data, error } = await authClient.organization.checkSlug({
    slug: my-org,
});
```

### Server Side

```ts
const data = await auth.api.checkOrganizationSlug({
    body: {
        slug: my-org,
    }
});
```

### Type Definition

```ts
type checkOrganizationSlug = {
      /**
       * The organization slug to check.  
       */
      slug: string = "my-org"
  
}
```


### Organization Hooks

You can customize organization operations using hooks that run before and after various organization-related activities. Better Auth provides two ways to configure hooks:

1. **Legacy organizationCreation hooks** (deprecated, use `organizationHooks` instead)
2. **Modern organizationHooks** (recommended) - provides comprehensive control over all organization-related activities

#### Organization Creation and Management Hooks

Control organization lifecycle operations:

```ts title="auth.ts"
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    organization({
      organizationHooks: {
        // Organization creation hooks
        beforeCreateOrganization: async ({ organization, user }) => {
          // Run custom logic before organization is created
          // Optionally modify the organization data
          return {
            data: {
              ...organization,
              metadata: {
                customField: "value",
              },
            },
          };
        },

        afterCreateOrganization: async ({ organization, member, user }) => {
          // Run custom logic after organization is created
          // e.g., create default resources, send notifications
          await setupDefaultResources(organization.id);
        },

        // Organization update hooks
        beforeUpdateOrganization: async ({ organization, user, member }) => {
          // Validate updates, apply business rules
          return {
            data: {
              ...organization,
              name: organization.name?.toLowerCase(),
            },
          };
        },

        afterUpdateOrganization: async ({ organization, user, member }) => {
          // Sync changes to external systems
          await syncOrganizationToExternalSystems(organization);
        },
      },
    }),
  ],
});
```

<Callout type="info">
  The legacy `organizationCreation` hooks are still supported but deprecated.
  Use `organizationHooks.beforeCreateOrganization` and
  `organizationHooks.afterCreateOrganization` instead for new projects.
</Callout>

#### Member Hooks

Control member operations within organizations:

```ts title="auth.ts"
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    organization({
      organizationHooks: {
        // Before a member is added to an organization
        beforeAddMember: async ({ member, user, organization }) => {
          // Custom validation or modification
          console.log(`Adding ${user.email} to ${organization.name}`);

          // Optionally modify member data
          return {
            data: {
              ...member,
              role: "custom-role", // Override the role
            },
          };
        },

        // After a member is added
        afterAddMember: async ({ member, user, organization }) => {
          // Send welcome email, create default resources, etc.
          await sendWelcomeEmail(user.email, organization.name);
        },

        // Before a member is removed
        beforeRemoveMember: async ({ member, user, organization }) => {
          // Cleanup user's resources, send notification, etc.
          await cleanupUserResources(user.id, organization.id);
        },

        // After a member is removed
        afterRemoveMember: async ({ member, user, organization }) => {
          await logMemberRemoval(user.id, organization.id);
        },

        // Before updating a member's role
        beforeUpdateMemberRole: async ({
          member,
          newRole,
          user,
          organization,
        }) => {
          // Validate role change permissions
          if (newRole === "owner" && !hasOwnerUpgradePermission(user)) {
            throw new Error("Cannot upgrade to owner role");
          }

          // Optionally modify the role
          return {
            data: {
              role: newRole,
            },
          };
        },

        // After updating a member's role
        afterUpdateMemberRole: async ({
          member,
          previousRole,
          user,
          organization,
        }) => {
          await logRoleChange(user.id, previousRole, member.role);
        },
      },
    }),
  ],
});
```

#### Invitation Hooks

Control invitation lifecycle:

```ts title="auth.ts"
export const auth = betterAuth({
  plugins: [
    organization({
      organizationHooks: {
        // Before creating an invitation
        beforeCreateInvitation: async ({
          invitation,
          inviter,
          organization,
        }) => {
          // Custom validation or expiration logic
          const customExpiration = new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7
          ); // 7 days

          return {
            data: {
              ...invitation,
              expiresAt: customExpiration,
            },
          };
        },

        // After creating an invitation
        afterCreateInvitation: async ({
          invitation,
          inviter,
          organization,
        }) => {
          // Send custom invitation email, track metrics, etc.
          await sendCustomInvitationEmail(invitation, organization);
        },

        // Before accepting an invitation
        beforeAcceptInvitation: async ({ invitation, user, organization }) => {
          // Additional validation before acceptance
          await validateUserEligibility(user, organization);
        },

        // After accepting an invitation
        afterAcceptInvitation: async ({
          invitation,
          member,
          user,
          organization,
        }) => {
          // Setup user account, assign default resources
          await setupNewMemberResources(user, organization);
        },

        // Before/after rejecting invitations
        beforeRejectInvitation: async ({ invitation, user, organization }) => {
          // Log rejection reason, send notification to inviter
        },

        afterRejectInvitation: async ({ invitation, user, organization }) => {
          await notifyInviterOfRejection(invitation.inviterId, user.email);
        },

        // Before/after cancelling invitations
        beforeCancelInvitation: async ({
          invitation,
          cancelledBy,
          organization,
        }) => {
          // Verify cancellation permissions
        },

        afterCancelInvitation: async ({
          invitation,
          cancelledBy,
          organization,
        }) => {
          await logInvitationCancellation(invitation.id, cancelledBy.id);
        },
      },
    }),
  ],
});
```

#### Team Hooks

Control team operations (when teams are enabled):

```ts title="auth.ts"
export const auth = betterAuth({
  plugins: [
    organization({
      teams: { enabled: true },
      organizationHooks: {
        // Before creating a team
        beforeCreateTeam: async ({ team, user, organization }) => {
          // Validate team name, apply naming conventions
          return {
            data: {
              ...team,
              name: team.name.toLowerCase().replace(/\s+/g, "-"),
            },
          };
        },

        // After creating a team
        afterCreateTeam: async ({ team, user, organization }) => {
          // Create default team resources, channels, etc.
          await createDefaultTeamResources(team.id);
        },

        // Before updating a team
        beforeUpdateTeam: async ({ team, updates, user, organization }) => {
          // Validate updates, apply business rules
          return {
            data: {
              ...updates,
              name: updates.name?.toLowerCase(),
            },
          };
        },

        // After updating a team
        afterUpdateTeam: async ({ team, user, organization }) => {
          await syncTeamChangesToExternalSystems(team);
        },

        // Before deleting a team
        beforeDeleteTeam: async ({ team, user, organization }) => {
          // Backup team data, notify members
          await backupTeamData(team.id);
        },

        // After deleting a team
        afterDeleteTeam: async ({ team, user, organization }) => {
          await cleanupTeamResources(team.id);
        },

        // Team member operations
        beforeAddTeamMember: async ({
          teamMember,
          team,
          user,
          organization,
        }) => {
          // Validate team membership limits, permissions
          const memberCount = await getTeamMemberCount(team.id);
          if (memberCount >= 10) {
            throw new Error("Team is full");
          }
        },

        afterAddTeamMember: async ({
          teamMember,
          team,
          user,
          organization,
        }) => {
          await grantTeamAccess(user.id, team.id);
        },

        beforeRemoveTeamMember: async ({
          teamMember,
          team,
          user,
          organization,
        }) => {
          // Backup user's team-specific data
          await backupTeamMemberData(user.id, team.id);
        },

        afterRemoveTeamMember: async ({
          teamMember,
          team,
          user,
          organization,
        }) => {
          await revokeTeamAccess(user.id, team.id);
        },
      },
    }),
  ],
});
```

#### Hook Error Handling

All hooks support error handling. Throwing an error in a `before` hook will prevent the operation from proceeding:

```ts title="auth.ts"
import { APIError } from "better-auth/api";

export const auth = betterAuth({
  plugins: [
    organization({
      organizationHooks: {
        beforeAddMember: async ({ member, user, organization }) => {
          // Check if user has pending violations
          const violations = await checkUserViolations(user.id);
          if (violations.length > 0) {
            throw new APIError("BAD_REQUEST", {
              message:
                "User has pending violations and cannot join organizations",
            });
          }
        },

        beforeCreateTeam: async ({ team, user, organization }) => {
          // Validate team name uniqueness
          const existingTeam = await findTeamByName(team.name, organization.id);
          if (existingTeam) {
            throw new APIError("BAD_REQUEST", {
              message: "Team name already exists in this organization",
            });
          }
        },
      },
    }),
  ],
});
```

### List User's Organizations

To list the organizations that a user is a member of, you can use `useListOrganizations` hook. It implements a reactive way to get the organizations that the user is a member of.

<Tabs items={["React", "Vue", "Svelte"]} default="React">
  <Tab value="React">
    ```tsx title="client.tsx"
    import { authClient } from "@/lib/auth-client"

    function App(){
    const { data: organizations } = authClient.useListOrganizations()
    return (
      <div>
        {organizations.map((org) => (
          <p>{org.name}</p>
        ))}
      </div>)
    }
    ```
  </Tab>

  <Tab value="Svelte">
    ```svelte title="page.svelte"
    <script lang="ts">
      import { authClient } from "$lib/auth-client";
      const organizations = authClient.useListOrganizations();
    </script>

    <h1>Organizations</h1>

    {#if $organizations.isPending}

      <p>Loading...</p>
    {:else if !$organizations.data?.length}
      <p>No organizations found.</p>
    {:else}
      <ul>
        {#each $organizations.data as organization}
          <li>{organization.name}</li>
        {/each}
      </ul>
    {/if}
    ```
  </Tab>

  <Tab value="Vue">
    ```vue title="organization.vue"
    <script lang="ts">;
    export default {
        setup() {
            const organizations = authClient.useListOrganizations()
            return { organizations };
        }
    };
    </script>

    <template>
        <div>
            <h1>Organizations</h1>
            <div v-if="organizations.isPending">Loading...</div>
            <div v-else-if="organizations.data === null">No organizations found.</div>
            <ul v-else>
                <li v-for="organization in organizations.data" :key="organization.id">
                    {{ organization.name }}
                </li>
            </ul>
        </div>
    </template>
    ```
  </Tab>
</Tabs>

Or alternatively, you can call `organization.list` if you don't want to use a hook.


### Client Side

```ts
const { data, error } = await authClient.organization.list({});
```

### Server Side

```ts
const data = await auth.api.listOrganizations({

    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type listOrganizations = {
  
}
```


### Active Organization

Active organization is the workspace the user is currently working on. By default when the user is signed in the active organization is set to `null`. You can set the active organization to the user session.

<Callout type="info">
  It's not always you want to persist the active organization in the session.
  You can manage the active organization in the client side only. For example,
  multiple tabs can have different active organizations.
</Callout>

#### Set Active Organization

You can set the active organization by calling the `organization.setActive` function. It'll set the active organization for the user session.

<Callout>
  In some applications, you may want the ability to unset an active
  organization. In this case, you can call this endpoint with `organizationId`
  set to `null`.
</Callout>


### Client Side

```ts
const { data, error } = await authClient.organization.setActive({
    organizationId: org-id, // optional
    organizationSlug: org-slug, // optional
});
```

### Server Side

```ts
const data = await auth.api.setActiveOrganization({
    body: {
        organizationId: org-id, // optional
        organizationSlug: org-slug, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type setActiveOrganization = {
      /**
       * The organization ID to set as active. It can be null to unset the active organization.  
       */
      organizationId?: string | null = "org-id"
      /**
       * The organization slug to set as active. It can be null to unset the active organization if organizationId is not provided.  
       */
      organizationSlug?: string = "org-slug"
  
}
```


To automatically set an active organization when a session is created, you can use [database hooks](/docs/concepts/database#database-hooks). You'll need to implement logic to determine which organization to set as the initial active organization.

```ts title="auth.ts"
export const auth = betterAuth({
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // Implement your custom logic to set initial active organization
          const organization = await getInitialOrganization(session.userId);
          return {
            data: {
              ...session,
              activeOrganizationId: organization?.id,
            },
          };
        },
      },
    },
  },
});
```

#### Use Active Organization

To retrieve the active organization for the user, you can call the `useActiveOrganization` hook. It returns the active organization for the user. Whenever the active organization changes, the hook will re-evaluate and return the new active organization.

<Tabs items={['React', 'Vue', 'Svelte']}>
  <Tab value="React">
    ```tsx title="client.tsx"
    import { authClient } from "@/lib/auth-client"

    function App(){
        const { data: activeOrganization } = authClient.useActiveOrganization()
        return (
            <div>
                {activeOrganization ? <p>{activeOrganization.name}</p> : null}
            </div>
        )
    }
    ```
  </Tab>

  <Tab value="Svelte">
    ```tsx title="client.tsx"
    <script lang="ts">
    import { authClient } from "$lib/auth-client";
    const activeOrganization = authClient.useActiveOrganization();
    </script>

    <h2>Active Organization</h2>

    {#if $activeOrganization.isPending}
    <p>Loading...</p>
    {:else if $activeOrganization.data === null}
    <p>No active organization found.</p>
    {:else}
    <p>{$activeOrganization.data.name}</p>
    {/if}
    ```
  </Tab>

  <Tab value="Vue">
    ```vue title="organization.vue"
    <script lang="ts">;
    export default {
        setup() {
            const activeOrganization = authClient.useActiveOrganization();
            return { activeOrganization };
        }
    };
    </script>

    <template>
        <div>
            <h2>Active organization</h2>
            <div v-if="activeOrganization.isPending">Loading...</div>
            <div v-else-if="activeOrganization.data === null">No active organization.</div>
            <div v-else>
                {{ activeOrganization.data.name }}
            </div>
        </div>
    </template>
    ```
  </Tab>
</Tabs>

### Get Full Organization

To get the full details of an organization, you can use the `getFullOrganization` function.
By default, if you don't pass any properties, it will use the active organization.


### Client Side

```ts
const { data, error } = await authClient.organization.getFullOrganization({
    organizationId: org-id, // optional
    organizationSlug: org-slug, // optional
    membersLimit, // optional
});
```

### Server Side

```ts
const data = await auth.api.getFullOrganization({
    query: {
        organizationId: org-id, // optional
        organizationSlug: org-slug, // optional
        membersLimit, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type getFullOrganization = {
      /**
       * The organization ID to get. By default, it will use the active organization.  
       */
      organizationId?: string = "org-id"
      /**
       * The organization slug to get.  
       */
      organizationSlug?: string = "org-slug"
      /**
       * The limit of members to get. By default, it uses the membershipLimit option which defaults to 100.
       */
      membersLimit?: number = 100
  
}
```


### Update Organization

To update organization info, you can use `organization.update`


### Client Side

```ts
const { data, error } = await authClient.organization.update({
    data,
    name: updated-name, // optional
    slug: updated-slug, // optional
    logo: new-logo.url, // optional
    metadata, // optional
});
```

### Server Side

```ts
const data = await auth.api.updateOrganization({
    body: {
        data,
        name: updated-name, // optional
        slug: updated-slug, // optional
        logo: new-logo.url, // optional
        metadata, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type updateOrganization = {
      /**
       * A partial list of data to update the organization. 
       */
      data: {
          /**
           * The name of the organization. 
           */
          name?: string = "updated-name"
          /**
           * The slug of the organization. 
           */
          slug?: string = "updated-slug"
          /**
           * The logo of the organization. 
           */
          logo?: string = "new-logo.url"
          /**
           * The metadata of the organization. 
           */
          metadata?: Record<string, any> | null = { customerId: "test" 
}
```


### Delete Organization

To remove user owned organization, you can use `organization.delete`


### Client Side

```ts
const { data, error } = await authClient.organization.delete({
    organizationId: org-id,
});
```

### Server Side

```ts
const data = await auth.api.deleteOrganization({
    body: {
        organizationId: org-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type deleteOrganization = {
      /*
      * The organization ID to delete.
      */
      organizationId: string = "org-id"
  
}
```


If the user has the necessary permissions (by default: role is owner) in the specified organization, all members, invitations and organization information will be removed.

You can configure how organization deletion is handled through `organizationDeletion` option:

```ts
const auth = betterAuth({
  plugins: [
    organization({
      disableOrganizationDeletion: true, //to disable it altogether
      organizationHooks: {
        beforeDeleteOrganization: async (data, request) => {
          // a callback to run before deleting org
        },
        afterDeleteOrganization: async (data, request) => {
          // a callback to run after deleting org
        },
      },
    }),
  ],
});
```