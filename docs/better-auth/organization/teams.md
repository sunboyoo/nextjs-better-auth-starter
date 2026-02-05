## Teams

Teams allow you to group members within an organization. The teams feature provides additional organization structure and can be used to manage permissions at a more granular level.

### Enabling Teams

To enable teams, pass the `teams` configuration option to both server and client plugins:

```ts title="auth.ts"
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    organization({
      teams: {
        enabled: true,
        maximumTeams: 10, // Optional: limit teams per organization
        allowRemovingAllTeams: false, // Optional: prevent removing the last team
      },
    }),
  ],
});
```

```ts title="auth-client.ts"
import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      teams: {
        enabled: true,
      },
    }),
  ],
});
```

### Managing Teams

#### Create Team

Create a new team within an organization:


### Client Side

```ts
const { data, error } = await authClient.organization.createTeam({
    name: my-team,
    organizationId: organization-id, // optional
});
```

### Server Side

```ts
const data = await auth.api.createTeam({
    body: {
        name: my-team,
        organizationId: organization-id, // optional
    }
});
```

### Type Definition

```ts
type createTeam = {
      /**
       * The name of the team. 
       */
      name: string = "my-team"
      /**
       * The organization ID which the team will be created in. Defaults to the active organization. 
       */
      organizationId?: string = "organization-id"
  
}
```


#### List Teams

Get all teams in an organization:


### Client Side

```ts
const { data, error } = await authClient.organization.listTeams({
    organizationId: organization-id, // optional
});
```

### Server Side

```ts
const data = await auth.api.listOrganizationTeams({
    query: {
        organizationId: organization-id, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type listOrganizationTeams = {
      /**
      * The organization ID which the teams are under to list. Defaults to the user's active organization. 
      */
      organizationId?: string = "organization-id"
  
}
```


#### Update Team

Update a team's details:


### Client Side

```ts
const { data, error } = await authClient.organization.updateTeam({
    teamId: team-id,
    data,
    name: My new team name, // optional
    organizationId: My new organization ID for this team, // optional
    createdAt, // optional
    updatedAt, // optional
});
```

### Server Side

```ts
const data = await auth.api.updateTeam({
    body: {
        teamId: team-id,
        data,
        name: My new team name, // optional
        organizationId: My new organization ID for this team, // optional
        createdAt, // optional
        updatedAt, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type updateTeam = {
      /**
       * The ID of the team to be updated. 
       */
      teamId: string = "team-id"
      /**
       * A partial object containing options for you to update.
       */
      data: {
          /**
           * The name of the team to be updated.
           */
          name?: string = "My new team name"
          /**
           * The organization ID which the team falls under.
           */
          organizationId?: string = "My new organization ID for this team"
          /**
           * The timestamp of when the team was created.
           */
          createdAt?: Date = new Date()
          /**
           * The timestamp of when the team was last updated.
           */
          updatedAt?: Date = new Date()
      
}
```


#### Remove Team

Delete a team from an organization:


### Client Side

```ts
const { data, error } = await authClient.organization.removeTeam({
    teamId: team-id,
    organizationId: organization-id, // optional
});
```

### Server Side

```ts
const data = await auth.api.removeTeam({
    body: {
        teamId: team-id,
        organizationId: organization-id, // optional
    }
});
```

### Type Definition

```ts
type removeTeam = {
      /**
       * The team ID of the team to remove. 
       */
      teamId: string = "team-id"
      /**
       * The organization ID which the team falls under. If not provided, it will default to the user's active organization. 
       */
      organizationId?: string = "organization-id"
  
}
```


#### Set Active Team

Sets the given team as the current active team. If `teamId` is `null` the current active team is unset.


### Client Side

```ts
const { data, error } = await authClient.organization.setActiveTeam({
    teamId: team-id, // optional
});
```

### Server Side

```ts
const data = await auth.api.setActiveTeam({
    body: {
        teamId: team-id, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type setActiveTeam = {
      /**
       * The team ID of the team to set as the current active team.
       */
      teamId?: string = "team-id"
  
}
```


#### List User Teams

List all teams that the current user is a part of.


### Client Side

```ts
const { data, error } = await authClient.organization.listUserTeams({});
```

### Server Side

```ts
const data = await auth.api.listUserTeams({

    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type listUserTeams = {
  
}
```


#### List Team Members

List the members of the given team.


### Client Side

```ts
const { data, error } = await authClient.organization.listTeamMembers({
    teamId: team-id, // optional
});
```

### Server Side

```ts
const data = await auth.api.listTeamMembers({
    query: {
        teamId: team-id, // optional
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type listTeamMembers = {
      /**
       * The team whose members we should return. If this is not provided the members of the current active team get returned.
       */
      teamId?: string = "team-id"
  
}
```


#### Add Team Member

Add a member to a team.


### Client Side

```ts
const { data, error } = await authClient.organization.addTeamMember({
    teamId: team-id,
    userId: user-id,
});
```

### Server Side

```ts
const data = await auth.api.addTeamMember({
    body: {
        teamId: team-id,
        userId: user-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type addTeamMember = {
      /**
       * The team the user should be a member of.
       */
      teamId: string = "team-id"
      /**
       * The user ID which represents the user to be added as a member.
       */
      userId: string = "user-id"
  
}
```


#### Remove Team Member

Remove a member from a team.


### Client Side

```ts
const { data, error } = await authClient.organization.removeTeamMember({
    teamId: team-id,
    userId: user-id,
});
```

### Server Side

```ts
const data = await auth.api.removeTeamMember({
    body: {
        teamId: team-id,
        userId: user-id,
    },
    // This endpoint requires session cookies.
    headers: await headers()
});
```

### Type Definition

```ts
type removeTeamMember = {
      /**
       * The team the user should be removed from.
       */
      teamId: string = "team-id"
      /**
       * The user which should be removed from the team.
       */
      userId: string = "user-id"
  
}
```


### Team Permissions

Teams follow the organization's permission system. To manage teams, users need the following permissions:

* `team:create` - Create new teams
* `team:update` - Update team details
* `team:delete` - Remove teams

By default:

* Organization owners and admins can manage teams
* Regular members cannot create, update, or delete teams

### Team Configuration Options

The teams feature supports several configuration options:

* `maximumTeams`: Limit the number of teams per organization

  ```ts
  teams: {
    enabled: true,
    maximumTeams: 10 // Fixed number
    // OR
    maximumTeams: async ({ organizationId, session }, ctx) => {
      // Dynamic limit based on organization plan
      const plan = await getPlan(organizationId)
      return plan === 'pro' ? 20 : 5
    },
    maximumMembersPerTeam: 10 // Fixed number
    // OR
    maximumMembersPerTeam: async ({ teamId, session, organizationId }, ctx) => {
      // Dynamic limit based on team plan
      const plan = await getPlan(organizationId, teamId)
      return plan === 'pro' ? 50 : 10
    },
  }
  ```

* `allowRemovingAllTeams`: Control whether the last team can be removed
  ```ts
  teams: {
    enabled: true,
    allowRemovingAllTeams: false // Prevent removing the last team
  }
  ```

### Team Members

When inviting members to an organization, you can specify a team:

```ts
await authClient.organization.inviteMember({
  email: "user@example.com",
  role: "member",
  teamId: "team-id",
});
```

The invited member will be added to the specified team upon accepting the invitation.

### Database Schema

When teams are enabled, new `team` and `teamMember` tables are added to the database.

Table Name: `team`

<DatabaseTable
  fields={[
  {
    name: "id",
    type: "string",
    description: "Unique identifier for each team",
    isPrimaryKey: true,
  },
  {
    name: "name",
    type: "string",
    description: "The name of the team",
  },
  {
    name: "organizationId",
    type: "string",
    description: "The ID of the organization",
    isForeignKey: true,
  },
  {
    name: "createdAt",
    type: "Date",
    description: "Timestamp of when the team was created",
  },
  {
    name: "updatedAt",
    type: "Date",
    isOptional: true,
    description: "Timestamp of when the team was created",
  },
]}
/>

Table Name: `teamMember`

<DatabaseTable
  fields={[
  {
    name: "id",
    type: "string",
    description: "Unique identifier for each team member",
    isPrimaryKey: true,
  },
  {
    name: "teamId",
    type: "string",
    description: "Unique identifier for each team",
    isForeignKey: true,
  },
  {
    name: "userId",
    type: "string",
    description: "The ID of the user",
    isForeignKey: true,
  },
  {
    name: "createdAt",
    type: "Date",
    description: "Timestamp of when the team member was created",
  },
]}
/>