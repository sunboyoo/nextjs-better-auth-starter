## Members

### List Members

To list all members of an organization you can use the `listMembers` function.


### Client Side

```ts
const { data, error } = await authClient.organization.listMembers({
    organizationId: organization-id, // optional
    limit, // optional
    offset, // optional
    sortBy: createdAt, // optional
    sortDirection: desc, // optional
    filterField: createdAt, // optional
    filterOperator: eq, // optional
    filterValue: value, // optional
});
```

### Server Side

```ts
const data = await auth.api.listMembers({
    query: {
        organizationId: organization-id, // optional
        limit, // optional
        offset, // optional
        sortBy: createdAt, // optional
        sortDirection: desc, // optional
        filterField: createdAt, // optional
        filterOperator: eq, // optional
        filterValue: value, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type listMembers = {
      /**
       * An optional organization ID to list members for. If not provided, will default to the user's active organization.
       */
      organizationId?: string = "organization-id"
      /**
       * The limit of members to return.
       */
      limit?: number = 100
      /**
       * The offset to start from.
       */
      offset?: number = 0
      /**
       * The field to sort by.
       */
      sortBy?: string = "createdAt"
      /**
       * The direction to sort by.
       */
      sortDirection?: "asc" | "desc" = "desc"
      /**
       * The field to filter by.
       */
      filterField?: string = "createdAt"
      /**
       * The operator to filter by.
       */
      filterOperator?: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "nin" | "contains" = "eq"
      /**
       * The value to filter by.
       */
      filterValue?: string = "value"
  
}
```


### Remove Member

To remove you can use `organization.removeMember`


### Client Side

```ts
const { data, error } = await authClient.organization.removeMember({
    memberIdOrEmail: user@example.com,
    organizationId: org-id, // optional
});
```

### Server Side

```ts
const data = await auth.api.removeMember({
    body: {
        memberIdOrEmail: user@example.com,
        organizationId: org-id, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type removeMember = {
      /**
       * The ID or email of the member to remove. 
       */
      memberIdOrEmail: string = "user@example.com"
      /**
       * The ID of the organization to remove the member from. If not provided, the active organization will be used. 
       */
      organizationId?: string = "org-id"
  
}
```


### Update Member Role

To update the role of a member in an organization, you can use the `organization.updateMemberRole`. If the user has the permission to update the role of the member, the role will be updated.


### Client Side

```ts
const { data, error } = await authClient.organization.updateMemberRole({
    role,
    memberId: member-id,
    organizationId: organization-id, // optional
});
```

### Server Side

```ts
await auth.api.updateMemberRole({
    body: {
        role,
        memberId: member-id,
        organizationId: organization-id, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type updateMemberRole = {
      /**
       * The new role to be applied. This can be a string or array of strings representing the roles. 
       */
      role: string | string[] = ["admin", "sale"]
      /**
       * The member id to apply the role update to. 
       */
      memberId: string = "member-id"
      /**
       * An optional organization ID which the member is a part of to apply the role update. If not provided, you must provide session headers to get the active organization. 
       */
      organizationId?: string = "organization-id"
  
}
```


### Get Active Member

To get the current member of the active organization you can use the `organization.getActiveMember` function. This function will return the user's member details in their active organization.


### Client Side

```ts
const { data, error } = await authClient.organization.getActiveMember({});
```

### Server Side

```ts
const member = await auth.api.getActiveMember({

    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type getActiveMember = {
  
}
```


### Get Active Member Role

To get the current role member of the active organization you can use the `organization.getActiveMemberRole` function. This function will return the user's member role in their active organization.


### Client Side

```ts
const { data, error } = await authClient.organization.getActiveMemberRole({});
```

### Server Side

```ts
const { role } = await auth.api.getActiveMemberRole({

    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type getActiveMemberRole = {
  
}
```


### Add Member

If you want to add a member directly to an organization without sending an invitation, you can use the `addMember` function which can only be invoked on the server.


### Client Side

```ts
const { data, error } = await authClient.organization.addMember({
    userId: user-id, // optional
    role,
    organizationId: org-id, // optional
    teamId: team-id, // optional
});
```

### Server Side

```ts
const data = await auth.api.addMember({
    body: {
        userId: user-id, // optional
        role,
        organizationId: org-id, // optional
        teamId: team-id, // optional
    }
});
```

### Type Definition

```ts
type addMember = {
      /**
       * The user ID which represents the user to be added as a member. If `null` is provided, then it's expected to provide session headers. 
       */
      userId?: string | null = "user-id"
      /**
       * The role(s) to assign to the new member. 
       */
      role: string | string[] = ["admin", "sale"]
      /**
       * An optional organization ID to pass. If not provided, will default to the user's active organization. 
       */
      organizationId?: string = "org-id"
      /**
       * An optional team ID to add the member to. 
       */
      teamId?: string = "team-id"
  
}
```


### Leave Organization

To leave organization you can use `organization.leave` function. This function will remove the current user from the organization.


### Client Side

```ts
const { data, error } = await authClient.organization.leave({
    organizationId: organization-id,
});
```

### Server Side

```ts
await auth.api.leaveOrganization({
    body: {
        organizationId: organization-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type leaveOrganization = {
      /**
       * The organization ID for the member to leave. 
       */
      organizationId: string = "organization-id"
  
}
```
