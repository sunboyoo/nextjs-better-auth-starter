## Access Control

The organization plugin provides a very flexible access control system. You can control the access of the user based on the role they have in the organization. You can define your own set of permissions based on the role of the user.

### Roles

By default, there are three roles in the organization:

`owner`: The user who created the organization by default. The owner has full control over the organization and can perform any action.

`admin`: Users with the admin role have full control over the organization except for deleting the organization or changing the owner.

`member`: Users with the member role have limited control over the organization. They can only read organization data and have no permissions to create, update, or delete resources.

<Callout>
  A user can have multiple roles. Multiple roles are stored as string separated
  by comma (",").
</Callout>

### Permissions

By default, there are three resources, and these have two to three actions.

**organization**:

`update` `delete`

**member**:

`create` `update` `delete`

**invitation**:

`create` `cancel`

The owner has full control over all the resources and actions. The admin has full control over all the resources except for deleting the organization or changing the owner. The member has no control over any of those actions other than reading the data.

### Custom Permissions

The plugin provides an easy way to define your own set of permissions for each role.

<Steps>
  <Step>
    #### Create Access Control

    You first need to create access controller by calling `createAccessControl` function and passing the statement object. The statement object should have the resource name as the key and the array of actions as the value.

    ```ts title="permissions.ts"
    import { createAccessControl } from "better-auth/plugins/access";

    /**
     * make sure to use `as const` so typescript can infer the type correctly
     */
    const statement = { // [!code highlight]
        project: ["create", "share", "update", "delete"], // [!code highlight]
    } as const; // [!code highlight]

    const ac = createAccessControl(statement); // [!code highlight]
    ```
  </Step>

  <Step>
    #### Create Roles

    Once you have created the access controller you can create roles with the permissions you have defined.

    ```ts title="permissions.ts"
    import { createAccessControl } from "better-auth/plugins/access";

    const statement = {
        project: ["create", "share", "update", "delete"],
    } as const;

    const ac = createAccessControl(statement);

    const member = ac.newRole({ // [!code highlight]
        project: ["create"], // [!code highlight]
    }); // [!code highlight]

    const admin = ac.newRole({ // [!code highlight]
        project: ["create", "update"], // [!code highlight]
    }); // [!code highlight]

    const owner = ac.newRole({ // [!code highlight]
        project: ["create", "update", "delete"], // [!code highlight]
    }); // [!code highlight]

    const myCustomRole = ac.newRole({ // [!code highlight]
        project: ["create", "update", "delete"], // [!code highlight]
        organization: ["update"], // [!code highlight]
    }); // [!code highlight]
    ```

    When you create custom roles for existing roles, the predefined permissions for those roles will be overridden. To add the existing permissions to the custom role, you need to import `defaultStatements` and merge it with your new statement, plus merge the roles' permissions set with the default roles.

    ```ts title="permissions.ts"
    import { createAccessControl } from "better-auth/plugins/access";
    import { defaultStatements, adminAc } from 'better-auth/plugins/organization/access'

    const statement = {
        ...defaultStatements, // [!code highlight]
        project: ["create", "share", "update", "delete"],
    } as const;

    const ac = createAccessControl(statement);

    const admin = ac.newRole({
        project: ["create", "update"],
        ...adminAc.statements, // [!code highlight]
    });
    ```
  </Step>

  <Step>
    #### Pass Roles to the Plugin

    Once you have created the roles you can pass them to the organization plugin both on the client and the server.

    ```ts title="auth.ts"
    import { betterAuth } from "better-auth"
    import { organization } from "better-auth/plugins"
    import { ac, owner, admin, member } from "@/auth/permissions"

    export const auth = betterAuth({
        plugins: [
            organization({
                ac,
                roles: {
                    owner,
                    admin,
                    member,
                    myCustomRole
                }
            }),
        ],
    });
    ```

    You also need to pass the access controller and the roles to the client plugin.

    ```ts title="auth-client"
    import { createAuthClient } from "better-auth/client"
    import { organizationClient } from "better-auth/client/plugins"
    import { ac, owner, admin, member, myCustomRole } from "@/auth/permissions"

    export const authClient = createAuthClient({
        plugins: [
            organizationClient({
                ac,
                roles: {
                    owner,
                    admin,
                    member,
                    myCustomRole
                }
            })
      ]
    })
    ```
  </Step>
</Steps>

### Access Control Usage

**Has Permission**:

You can use the `hasPermission` action provided by the `api` to check the permission of the user.

```ts title="api.ts"
import { auth } from "@/auth";

await auth.api.hasPermission({
  headers: await headers(),
  body: {
    permissions: {
      project: ["create"], // This must match the structure in your access control
    },
  },
});

// You can also check multiple resource permissions at the same time
await auth.api.hasPermission({
  headers: await headers(),
  body: {
    permissions: {
      project: ["create"], // This must match the structure in your access control
      sale: ["create"],
    },
  },
});
```

If you want to check the permission of the user on the client from the server you can use the `hasPermission` function provided by the client.

```ts title="auth-client.ts"
const canCreateProject = await authClient.organization.hasPermission({
  permissions: {
    project: ["create"],
  },
});

// You can also check multiple resource permissions at the same time
const canCreateProjectAndCreateSale =
  await authClient.organization.hasPermission({
    permissions: {
      project: ["create"],
      sale: ["create"],
    },
  });
```

**Check Role Permission**:

Once you have defined the roles and permissions to avoid checking the permission from the server you can use the `checkRolePermission` function provided by the client.

```ts title="auth-client.ts"
const canCreateProject = authClient.organization.checkRolePermission({
  permissions: {
    organization: ["delete"],
  },
  role: "admin",
});

// You can also check multiple resource permissions at the same time
const canCreateProjectAndCreateSale =
  authClient.organization.checkRolePermission({
    permissions: {
      organization: ["delete"],
      member: ["delete"],
    },
    role: "admin",
  });
```

<Callout type="warn">
  This will not include any dynamic roles as everything is ran synchronously on the client side.
  Please use the [hasPermission](#access-control-usage) APIs to include checks for any dynamic roles & permissions.
</Callout>

***