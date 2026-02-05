
## Usage

Before performing any admin operations, the user must be authenticated with an admin account. An admin is any user assigned the `admin` role or any user whose ID is included in the `adminUserIds` option.

### Create User

Allows an admin to create a new user.


### Client Side

```ts
const { data, error } = await authClient.admin.createUser({
    email: user@example.com,
    password: some-secure-password,
    name: James Smith,
    role: user, // optional
    data, // optional
});
```

### Server Side

```ts
const newUser = await auth.api.createUser({
    body: {
        email: user@example.com,
        password: some-secure-password,
        name: James Smith,
        role: user, // optional
        data, // optional
    }
});
```

### Type Definition

```ts
type createUser = {
      /**
       * The email of the user. 
       */
      email: string = "user@example.com"
      /**
       * The password of the user. 
       */
      password: string = "some-secure-password"
      /**
       * The name of the user. 
       */
      name: string = "James Smith"
      /**
       * A string or array of strings representing the roles to apply to the new user. 
       */
      role?: string | string[] = "user"
      /**
       * Extra fields for the user. Including custom additional fields. 
       */
      data?: Record<string, any> = { customField: "customValue" 
}
```


### List Users

Allows an admin to list all users in the database.


### Client Side

```ts
const { data, error } = await authClient.admin.listUsers({
    searchValue: some name, // optional
    searchField: name, // optional
    searchOperator: contains, // optional
    limit, // optional
    offset, // optional
    sortBy: name, // optional
    sortDirection: desc, // optional
    filterField: email, // optional
    filterValue: hello@example.com, // optional
    filterOperator: eq, // optional
});
```

### Server Side

```ts
const data = await auth.api.listUsers({
    query: {
        searchValue: some name, // optional
        searchField: name, // optional
        searchOperator: contains, // optional
        limit, // optional
        offset, // optional
        sortBy: name, // optional
        sortDirection: desc, // optional
        filterField: email, // optional
        filterValue: hello@example.com, // optional
        filterOperator: eq, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type listUsers = {
    /**
     * The value to search for. 
     */
    searchValue?: string = "some name"
    /**
     * The field to search in, defaults to email. Can be `email` or `name`. 
     */
    searchField?: "email" | "name" = "name"
    /**
     * The operator to use for the search. Can be `contains`, `starts_with` or `ends_with`. 
     */
    searchOperator?: "contains" | "starts_with" | "ends_with" = "contains"
    /**
     * The number of users to return. Defaults to 100.
     */
    limit?: string | number = 100
    /**
     * The offset to start from. 
     */
    offset?: string | number = 100
    /**
     * The field to sort by. 
     */
    sortBy?: string = "name"
    /**
     * The direction to sort by. 
     */
    sortDirection?: "asc" | "desc" = "desc"
    /**
     * The field to filter by. 
     */
    filterField?: string = "email"
    /**
     * The value to filter by. 
     */
    filterValue?: string | number | boolean = "hello@example.com"
    /**
     * The operator to use for the filter. 
     */
    filterOperator?: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" = "eq"
  
}
```


#### Query Filtering

The `listUsers` function supports various filter operators including `eq`, `contains`, `starts_with`, and `ends_with`.

#### Pagination

The `listUsers` function supports pagination by returning metadata alongside the user list. The response includes the following fields:

```ts
{
  users: User[],   // Array of returned users
  total: number,   // Total number of users after filters and search queries
  limit: number | undefined,   // The limit provided in the query
  offset: number | undefined   // The offset provided in the query
}
```

##### How to Implement Pagination

To paginate results, use the `total`, `limit`, and `offset` values to calculate:

* **Total pages:** `Math.ceil(total / limit)`
* **Current page:** `(offset / limit) + 1`
* **Next page offset:** `Math.min(offset + limit, (total - 1))` – The value to use as `offset` for the next page, ensuring it does not exceed the total number of pages.
* **Previous page offset:** `Math.max(0, offset - limit)` – The value to use as `offset` for the previous page (ensuring it doesn’t go below zero).

##### Example Usage

Fetching the second page with 10 users per page:

```ts title="admin.ts"
const pageSize = 10;
const currentPage = 2;

const users = await authClient.admin.listUsers({
    query: {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
    }
});

const totalUsers = users.total;
const totalPages = Math.ceil(totalUsers / pageSize)
```

### Set User Role

Changes the role of a user.


### Client Side

```ts
const { data, error } = await authClient.admin.setRole({
    userId: user-id, // optional
    role: admin,
});
```

### Server Side

```ts
const data = await auth.api.setRole({
    body: {
        userId: user-id, // optional
        role: admin,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type setRole = {
      /**
       * The user id which you want to set the role for.
       */
      userId?: string = "user-id"
      /**
       * The role to set, this can be a string or an array of strings. 
       */
      role: string | string[] = "admin"
  
}
```


### Set User Password

Changes the password of a user.


### Client Side

```ts
const { data, error } = await authClient.admin.setUserPassword({
    newPassword: new-password,
    userId: user-id,
});
```

### Server Side

```ts
const data = await auth.api.setUserPassword({
    body: {
        newPassword: new-password,
        userId: user-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type setUserPassword = {
      /**
       * The new password. 
       */
      newPassword: string = 'new-password'
      /**
       * The user id which you want to set the password for.
       */
      userId: string = 'user-id'
  
}
```


### Update user

Update a user's details.


### Client Side

```ts
const { data, error } = await authClient.admin.updateUser({
    userId: user-id,
    data,
});
```

### Server Side

```ts
const data = await auth.api.adminUpdateUser({
    body: {
        userId: user-id,
        data,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type adminUpdateUser = {
      /**
       * The user id which you want to update.
       */
      userId: string = "user-id"
      /**
       * The data to update.
       */
      data: Record<string, any> = { name: "John Doe" 
}
```


### Ban User

Bans a user, preventing them from signing in and revokes all of their existing sessions.


### Client Side

```ts
const { data, error } = await authClient.admin.banUser({
    userId: user-id,
    banReason: Spamming, // optional
    banExpiresIn, // optional
});
```

### Server Side

```ts
await auth.api.banUser({
    body: {
        userId: user-id,
        banReason: Spamming, // optional
        banExpiresIn, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type banUser = {
      /**
       * The user id which you want to ban.
       */
      userId: string = "user-id"
      /**
       * The reason for the ban. 
       */
      banReason?: string = "Spamming"
      /**
       * The number of seconds until the ban expires. If not provided, the ban will never expire. 
       */
      banExpiresIn?: number = 60 * 60 * 24 * 7
  
}
```


### Unban User

Removes the ban from a user, allowing them to sign in again.


### Client Side

```ts
const { data, error } = await authClient.admin.unbanUser({
    userId: user-id,
});
```

### Server Side

```ts
await auth.api.unbanUser({
    body: {
        userId: user-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type unbanUser = {
      /**
       * The user id which you want to unban.
       */
      userId: string = "user-id"
  
}
```


### List User Sessions

Lists all sessions for a user.


### Client Side

```ts
const { data, error } = await authClient.admin.listUserSessions({
    userId: user-id,
});
```

### Server Side

```ts
const data = await auth.api.listUserSessions({
    body: {
        userId: user-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type listUserSessions = {
      /**
       * The user id. 
       */
      userId: string = "user-id"
  
}
```


### Revoke User Session

Revokes a specific session for a user.


### Client Side

```ts
const { data, error } = await authClient.admin.revokeUserSession({
    sessionToken: session_token_here,
});
```

### Server Side

```ts
const data = await auth.api.revokeUserSession({
    body: {
        sessionToken: session_token_here,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type revokeUserSession = {
      /**
       * The session token which you want to revoke. 
       */
      sessionToken: string = "session_token_here"
  
}
```


### Revoke All Sessions for a User

Revokes all sessions for a user.


### Client Side

```ts
const { data, error } = await authClient.admin.revokeUserSessions({
    userId: user-id,
});
```

### Server Side

```ts
const data = await auth.api.revokeUserSessions({
    body: {
        userId: user-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type revokeUserSessions = {
      /**
       * The user id which you want to revoke all sessions for. 
       */
      userId: string = "user-id"
  
}
```


### Impersonate User

This feature allows an admin to create a session that mimics the specified user. The session will remain active until either the browser session ends or it reaches 1 hour. You can change this duration by setting the `impersonationSessionDuration` option.


### Client Side

```ts
const { data, error } = await authClient.admin.impersonateUser({
    userId: user-id,
});
```

### Server Side

```ts
const data = await auth.api.impersonateUser({
    body: {
        userId: user-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type impersonateUser = {
      /**
       * The user id which you want to impersonate. 
       */
      userId: string = "user-id"
  
}
```


### Stop Impersonating User

To stop impersonating a user and continue with the admin account, you can use `stopImpersonating`


### Client Side

```ts
const { data, error } = await authClient.admin.stopImpersonating({});
```

### Server Side

```ts
await auth.api.stopImpersonating({

    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type stopImpersonating = {
  
}
```


### Remove User

Hard deletes a user from the database.


### Client Side

```ts
const { data, error } = await authClient.admin.removeUser({
    userId: user-id,
});
```

### Server Side

```ts
const deletedUser = await auth.api.removeUser({
    body: {
        userId: user-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type removeUser = {
      /**
       * The user id which you want to remove. 
       */
      userId: string = "user-id"
  
}
```
