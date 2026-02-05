## Schema

The organization plugin adds the following tables to the database:

### Organization

Table Name: `organization`

<DatabaseTable
  fields={[
  {
    name: "id",
    type: "string",
    description: "Unique identifier for each organization",
    isPrimaryKey: true,
  },
  {
    name: "name",
    type: "string",
    description: "The name of the organization",
  },
  {
    name: "slug",
    type: "string",
    description: "The slug of the organization",
  },
  {
    name: "logo",
    type: "string",
    description: "The logo of the organization",
    isOptional: true,
  },
  {
    name: "metadata",
    type: "string",
    description: "Additional metadata for the organization",
    isOptional: true,
  },
  {
    name: "createdAt",
    type: "Date",
    description: "Timestamp of when the organization was created",
  },
]}
/>

### Member

Table Name: `member`

<DatabaseTable
  fields={[
  {
    name: "id",
    type: "string",
    description: "Unique identifier for each member",
    isPrimaryKey: true,
  },
  {
    name: "userId",
    type: "string",
    description: "The ID of the user",
    isForeignKey: true,
  },
  {
    name: "organizationId",
    type: "string",
    description: "The ID of the organization",
    isForeignKey: true,
  },
  {
    name: "role",
    type: "string",
    description: "The role of the user in the organization",
  },
  {
    name: "createdAt",
    type: "Date",
    description: "Timestamp of when the member was added to the organization",
  },
]}
/>

### Invitation

Table Name: `invitation`

<DatabaseTable
  fields={[
  {
    name: "id",
    type: "string",
    description: "Unique identifier for each invitation",
    isPrimaryKey: true,
  },
  {
    name: "email",
    type: "string",
    description: "The email address of the user",
  },
  {
    name: "inviterId",
    type: "string",
    description: "The ID of the inviter",
    isForeignKey: true,
  },
  {
    name: "organizationId",
    type: "string",
    description: "The ID of the organization",
    isForeignKey: true,
  },
  {
    name: "role",
    type: "string",
    description: "The role of the user in the organization",
  },
  {
    name: "status",
    type: "string",
    description: "The status of the invitation",
  },
  {
    name: "createdAt",
    type: "Date",
    description: "Timestamp of when the invitation was created"
  },
  {
    name: "expiresAt",
    type: "Date",
    description: "Timestamp of when the invitation expires",
  },
]}
/>

If teams are enabled, you need to add the following fields to the invitation table:

<DatabaseTable
  fields={[
  {
    name: "teamId",
    type: "string",
    description: "The ID of the team",
    isOptional: true,
  },
]}
/>

### Session

Table Name: `session`

You need to add two more fields to the session table to store the active organization ID and the active team ID.

<DatabaseTable
  fields={[
  {
    name: "activeOrganizationId",
    type: "string",
    description: "The ID of the active organization",
    isOptional: true,
  },
  {
    name: "activeTeamId",
    type: "string",
    description: "The ID of the active team",
    isOptional: true,
  },
]}
/>

### Organization Role (optional)

Table Name: `organizationRole`

<DatabaseTable
  fields={[
  {
    name: "id",
    type: "string",
    description: "Unique identifier for each organization role",
  },
  {
    name: "organizationId",
    type: "string",
    description: "The ID of the organization",
    isForeignKey: true,
  },
  {
    name: "role",
    type: "string",
    description: "The name of the role",
  },
  {
    name: "permission",
    type: "string",
    description: "The permission of the role",
  },
  {
    name: "createdAt",
    type: "Date",
    description: "Timestamp of when the organization role was created",
  },
  {
    name: "updatedAt",
    type: "Date",
    description: "Timestamp of when the organization role was updated",
  },
]}
/>

### Teams (optional)

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

Table Name: `invitation`

<DatabaseTable
  fields={[
  {
    name: "teamId",
    type: "string",
    description: "The ID of the team",
    isOptional: true,
  },
]}
/>

### Customizing the Schema

To change the schema table name or fields, you can pass `schema` option to the organization plugin.

```ts title="auth.ts"
const auth = betterAuth({
  plugins: [
    organization({
      schema: {
        organization: {
          modelName: "organizations", //map the organization table to organizations
          fields: {
            name: "title", //map the name field to title
          },
          additionalFields: {
            // Add a new field to the organization table
            myCustomField: {
              type: "string",
              input: true,
              required: false,
            },
          },
        },
      },
    }),
  ],
});
```

#### Additional Fields

Starting with [Better Auth v1.3](https://github.com/better-auth/better-auth/releases/tag/v1.3.0), you can easily add custom fields to the `organization`, `invitation`, `member`, and `team` tables.

When you add extra fields to a model, the relevant API endpoints will automatically accept and return these new properties. For instance, if you add a custom field to the `organization` table, the `createOrganization` endpoint will include this field in its request and response payloads as needed.

```ts title="auth.ts"
const auth = betterAuth({
  plugins: [
    organization({
      schema: {
        organization: {
          additionalFields: {
            myCustomField: {
              // [!code highlight]
              type: "string", // [!code highlight]
              input: true, // [!code highlight]
              required: false, // [!code highlight]
            }, // [!code highlight]
          },
        },
      },
    }),
  ],
});
```

For inferring the additional fields, you can use the `inferOrgAdditionalFields` function. This function will infer the additional fields from the auth object type.

```ts title="auth-client.ts"
import { createAuthClient } from "better-auth/client";
import {
  inferOrgAdditionalFields,
  organizationClient,
} from "better-auth/client/plugins";
import type { auth } from "@/auth"; // import the auth object type only

const client = createAuthClient({
  plugins: [
    organizationClient({
      schema: inferOrgAdditionalFields<typeof auth>(),
    }),
  ],
});
```

if you can't import the auth object type, you can use the `inferOrgAdditionalFields` function without the generic. This function will infer the additional fields from the schema object.

```ts title="auth-client.ts"
const client = createAuthClient({
  plugins: [
    organizationClient({
      schema: inferOrgAdditionalFields({
        organization: {
          // [!code highlight]
          additionalFields: {
            newField: {
              // [!code highlight]
              type: "string", // [!code highlight]
            }, // [!code highlight]
          },
        },
      }),
    }),
  ],
});

//example usage
await client.organization.create({
  name: "Test",
  slug: "test",
  newField: "123", //this should be allowed
  //@ts-expect-error - this field is not available
  unavailableField: "123", //this should be not allowed
});
```