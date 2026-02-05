## Dynamic Access Control

Dynamic access control allows you to create roles at runtime for organizations. This is achieved by storing the
created roles and permissions associated with an organization in a database table.

### Enabling Dynamic Access Control

To enable dynamic access control, pass the `dynamicAccessControl` configuration option with `enabled` set to `true` to both server and client plugins.

Ensure you have pre-defined an `ac` instance on the server auth plugin.
This is important as this is how we can infer the permissions that are available for use.

```ts title="auth.ts"
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { ac } from "@/auth/permissions";

export const auth = betterAuth({
    plugins: [ // [!code highlight]
        organization({ // [!code highlight]
            ac, // Must be defined in order for dynamic access control to work // [!code highlight]
            dynamicAccessControl: { // [!code highlight]
              enabled: true, // [!code highlight]
            }, // [!code highlight]
        }) // [!code highlight]
    ] // [!code highlight]
})
```

```ts title="auth-client.ts"
import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    plugins: [ // [!code highlight]
        organizationClient({ // [!code highlight]
            dynamicAccessControl: { // [!code highlight]
              enabled: true, // [!code highlight]
            }, // [!code highlight]
        }) // [!code highlight]
    ] // [!code highlight]
})
```

<Callout>
  This will require you to run migrations to add the new `organizationRole` table to the database.
</Callout>

<Callout type="warn">
  The `authClient.organization.checkRolePermission` function will not include any dynamic roles as everything is ran synchronously on the client side.
  Please use the [hasPermission](#access-control-usage) APIs to include checks for any dynamic roles.
</Callout>

### Creating a role

To create a new role for an organization at runtime, you can use the `createRole` function.

Only users with roles which contain the `ac` resource with the `create` permission can create a new role.
By default, only the `admin` and `owner` roles have this permission. You also cannot add permissions that your
current role in that organization can't already access.


### Client Side

```ts
const { data, error } = await authClient.organization.createRole({
    role: my-unique-role,
    permission, // optional
    organizationId: organization-id, // optional
});
```

### Server Side

```ts
await auth.api.createOrgRole({
    body: {
        role: my-unique-role,
        permission, // optional
        organizationId: organization-id, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type createOrgRole = {
      /**
       * A unique name of the role to create.
       */
      role: string = "my-unique-role"
      /**
       * The permissions to assign to the role.
       */
      permission?: Record<string, string[]> = permission,
      /**
       * The organization ID which the role will be created in. Defaults to the active organization.
       */
      organizationId?: string = "organization-id"
  
}
```


Now you can freely call [`updateMemberRole`](#update-member-role) to update the role of a member with your newly created role!

### Deleting a role

To delete a role, you can use the `deleteRole` function, then provide either a `roleName` or `roleId` parameter along
with the `organizationId` parameter.


### Client Side

```ts
const { data, error } = await authClient.organization.deleteRole({
    roleName: my-role, // optional
    roleId: role-id, // optional
    organizationId: organization-id, // optional
});
```

### Server Side

```ts
await auth.api.deleteOrgRole({
    body: {
        roleName: my-role, // optional
        roleId: role-id, // optional
        organizationId: organization-id, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type deleteOrgRole = {
      /**
       * The name of the role to delete. Alternatively, you can pass a `roleId` parameter instead.
       */
      roleName?: string = "my-role"
      /**
       * The id of the role to delete. Alternatively, you can pass a `roleName` parameter instead.
       */
      roleId?: string = "role-id"
      /**
       * The organization ID which the role will be deleted in. Defaults to the active organization.
       */
      organizationId?: string = "organization-id"
  
}
```


### Listing roles

To list roles, you can use the `listOrgRoles` function.
This requires the `ac` resource with the `read` permission for the member to be able to list roles.


### Client Side

```ts
const { data, error } = await authClient.organization.listRoles({
    organizationId: organization-id, // optional
});
```

### Server Side

```ts
const roles = await auth.api.listOrgRoles({
    query: {
        organizationId: organization-id, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type listOrgRoles = {
      /**
       * The organization ID which the roles are under to list. Defaults to the user's active organization. 
       */
      organizationId?: string = "organization-id"
  
}
```


### Getting a specific role

To get a specific role, you can use the `getOrgRole` function and pass either a `roleName` or `roleId` parameter.
This requires the `ac` resource with the `read` permission for the member to be able to get a role.


### Client Side

```ts
const { data, error } = await authClient.organization.getRole({
    roleName: my-role, // optional
    roleId: role-id, // optional
    organizationId: organization-id, // optional
});
```

### Server Side

```ts
const role = await auth.api.getOrgRole({
    query: {
        roleName: my-role, // optional
        roleId: role-id, // optional
        organizationId: organization-id, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type getOrgRole = {
      /**
       * The name of the role to get. Alternatively, you can pass a `roleId` parameter instead.
       */
      roleName?: string = "my-role"
      /**
       * The id of the role to get. Alternatively, you can pass a `roleName` parameter instead.
       */
      roleId?: string = "role-id"
      /**
       * The organization ID from which the role will be retrieved. Defaults to the active organization.
       */
      organizationId?: string = "organization-id"
  
}
```


### Updating a role

To update a role, you can use the `updateOrgRole` function and pass either a `roleName` or `roleId` parameter.


### Client Side

```ts
const { data, error } = await authClient.organization.updateRole({
    roleName: my-role, // optional
    roleId: role-id, // optional
    organizationId: organization-id, // optional
    data,
    permission, // optional
});
```

### Server Side

```ts
const updatedRole = await auth.api.updateOrgRole({
    body: {
        roleName: my-role, // optional
        roleId: role-id, // optional
        organizationId: organization-id, // optional
        data,
        permission, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type updateOrgRole = {
      /**
       * The name of the role to update. Alternatively, you can pass a `roleId` parameter instead.
       */
      roleName?: string = "my-role"
      /**
       * The id of the role to update. Alternatively, you can pass a `roleName` parameter instead.
       */
      roleId?: string = "role-id"
      /**
       * The organization ID which the role will be updated in. Defaults to the active organization.
       */
      organizationId?: string = "organization-id"
      /**
       * The data which will be updated
      */
      data: {
        /**
         * Optionally update the permissions of the role.
         */
        permission?: Record<string, string[]> = { project: ["create", "update", "delete"] 
}
```


### Configuration Options

Below is a list of options that can be passed to the `dynamicAccessControl` object.

#### `enabled`

This option is used to enable or disable dynamic access control. By default, it is disabled.

```ts
organization({
  dynamicAccessControl: {
    enabled: true // [!code highlight]
  }
})
```

#### `maximumRolesPerOrganization`

This option is used to limit the number of roles that can be created for an organization.

By default, the maximum number of roles that can be created for an organization is infinite.

```ts
organization({
  dynamicAccessControl: {
    maximumRolesPerOrganization: 10 // [!code highlight]
  }
})
```

You can also pass a function that returns a number.

```ts
organization({
  dynamicAccessControl: {
    maximumRolesPerOrganization: async (organizationId) => { // [!code highlight]
      const organization = await getOrganization(organizationId); // [!code highlight]
      return organization.plan === "pro" ? 100 : 10; // [!code highlight]
    } // [!code highlight]
  }
})
```

### Additional Fields

To add additional fields to the `organizationRole` table, you can pass the `additionalFields` configuration option to the `organization` plugin.

```ts
organization({
  schema: {
    organizationRole: {
      additionalFields: {
        // Role colors!
        color: {
          type: "string",
          defaultValue: "#ffffff",
        },
        //... other fields
      },
    },
  },
})
```

Then, if you don't already use `inferOrgAdditionalFields` to infer the additional fields, you can use it to infer the additional fields.

```ts title="auth-client.ts"
import { createAuthClient } from "better-auth/client"
import { organizationClient, inferOrgAdditionalFields } from "better-auth/client/plugins"
import type { auth } from "./auth"

export const authClient = createAuthClient({
    plugins: [
        organizationClient({
            schema: inferOrgAdditionalFields<typeof auth>()
        })
    ]
})
```

Otherwise, you can pass the schema values directly, the same way you do on the org plugin in the server.

```ts title="auth-client.ts"
import { createAuthClient } from "better-auth/client"
import { organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    plugins: [
        organizationClient({
            schema: {
                organizationRole: {
                    additionalFields: {
                        color: {
                            type: "string",
                            defaultValue: "#ffffff",
                        }
                    }
                }
            }
        })
    ]
})
```

***