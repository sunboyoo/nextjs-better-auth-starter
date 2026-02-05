
## Schema

This plugin adds the following fields to the `user` table:

<DatabaseTable
  fields={[
  {
    name: "role",
    type: "string",
    description:
      "The user's role. Defaults to `user`. Admins will have the `admin` role.",
    isOptional: true,
  },
  {
    name: "banned",
    type: "boolean",
    description: "Indicates whether the user is banned.",
    isOptional: true,
  },
  {
    name: "banReason",
    type: "string",
    description: "The reason for the user's ban.",
    isOptional: true,
  },
  {
    name: "banExpires",
    type: "date",
    description: "The date when the user's ban will expire.",
    isOptional: true,
  },
]}
/>

And adds one field in the `session` table:

<DatabaseTable
  fields={[
  {
    name: "impersonatedBy",
    type: "string",
    description: "The ID of the admin that is impersonating this session.",
    isOptional: true,
  },
]}
/>