https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs&queryGroups=package-manager&package-manager=pnpm

Creating a Supabase client for SSR

Configure your Supabase client to use cookies

To use Server-Side Rendering (SSR) with Supabase, you need to configure your Supabase client to use cookies. The @supabase/ssr package helps you do this for JavaScript/TypeScript applications.

Install#
Install the @supabase/supabase-js and @supabase/ssr helper packages:


npm

yarn

pnpm
pnpm add @supabase/supabase-js @supabase/ssr
Set environment variables#
Create a .env.local file in the project root directory. In the file, set the project's Supabase URL and Key:

Project URL
organization01 / project01
https://tatcudvjapnxrktxsqmf.supabase.co

Publishable key
organization01 / project01
sb_publishable_gdCxb9EtJwqMvJTQzbq-zg_Q5PG2D9j

Anon key
organization01 / project01
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdGN1ZHZqYXBueHJrdHhzcW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NTA5NzUsImV4cCI6MjA3NzAyNjk3NX0.mj9ymCQo-NroTdUe6CPsNlFyKBfywe4CtUe4PhS9Fto

You can also get the Project URL and key from the project's Connect dialog.

Changes to API keys
Supabase is changing the way keys work to improve project security and developer experience. You can read the full announcement, but in the transition period, you can use both the current anon and service_role keys and the new publishable key with the form sb_publishable_xxx which will replace the older keys.

In most cases, you can get the correct key from the Project's Connect dialog, but if you want a specific key, you can find all keys in the API Keys section of a Project's Settings page:

For legacy keys, copy the anon key for client-side operations and the service_role key for server-side operations from the Legacy API Keys tab.
For new keys, open the API Keys tab, if you don't have a publishable key already, click Create new API Keys, and copy the value from the Publishable key section.
Read the API keys docs for a full explanation of all key types and their uses.


Next.js

SvelteKit

Astro

Remix

React Router

Express

Hono
NEXT_PUBLIC_SUPABASE_URL=supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=supabase_publishable_key
Create a client#
You need setup code to configure a Supabase client to use cookies. Once you have the utility code, you can use the createClient utility functions to get a properly configured Supabase client.

Use the browser client in code that runs on the browser, and the server client in code that runs on the server.


Next.js

SvelteKit

Astro

Remix

React Router

Express

Hono
Write utility functions to create Supabase clients#
To access Supabase from a Next.js app, you need 2 types of Supabase clients:

Client Component client - To access Supabase from Client Components, which run in the browser.
Server Component client - To access Supabase from Server Components, Server Actions, and Route Handlers, which run only on the server.
Since Next.js Server Components can't write cookies, you need a Proxy to refresh expired Auth tokens and store them.

The Proxy is responsible for:

Refreshing the Auth token by calling supabase.auth.getClaims().
Passing the refreshed Auth token to Server Components, so they don't attempt to refresh the same token themselves. This is accomplished with request.cookies.set.
Passing the refreshed Auth token to the browser, so it replaces the old token. This is accomplished with response.cookies.set.

What does the `cookies` object do?

Do I need to create a new client for every route?
Create a lib/supabase folder at the root of your project, or inside the ./src folder if you are using one, with a file for each type of client. Then copy the lib utility functions for each client type.


lib/supabase/client.ts

lib/supabase/server.ts
import { createBrowserClient } from '@supabase/ssr'
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
View source
Hook up proxy#
The code adds a matcher so the Proxy doesn't run on routes that don't access Supabase.

Be careful when protecting pages. The server gets the user session from the cookies, which can be spoofed by anyone.

Always use supabase.auth.getClaims() to protect pages and user data.

Never trust supabase.auth.getSession() inside server code such as Proxy. It isn't guaranteed to revalidate the Auth token.

It's safe to trust getClaims() because it validates the JWT signature against the project's published public keys every time.


proxy.ts

lib/supabase/proxy.ts
import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
View source
Congratulations#
You're done! To recap, you've successfully:

Called Supabase from a Server Action.
Called Supabase from a Server Component.
Set up a Supabase client utility to call Supabase from a Client Component. You can use this if you need to call Supabase from a Client Component, for example to set up a realtime subscription.
Set up Proxy to automatically refresh the Supabase Auth session.
You can now use any Supabase features from your client or server code!