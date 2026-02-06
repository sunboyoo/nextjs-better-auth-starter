import { mcpHandler } from "@better-auth/oauth-provider";
import { createMcpHandler } from "mcp-handler";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as z from "zod";

const baseUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

const handler = mcpHandler(
  {
    jwksUrl: `${baseUrl}/api/auth/jwks`,
    verifyOptions: {
      audience: `${baseUrl}/api/mcp`,
      issuer: baseUrl,
    },
  },
  (req, jwt) => {
    return createMcpHandler(
      (server) => {
        server.registerTool(
          "echo",
          {
            description: "Echo a message",
            inputSchema: {
              message: z.string(),
            },
          },
          async ({ message }) => {
            const org = jwt?.[`${baseUrl}/org`];
            return {
              content: [
                {
                  type: "text",
                  text: `Echo: ${message}${
                    jwt?.sub ? ` for user ${jwt.sub}` : ""
                  }${org ? ` for organization ${String(org)}` : ""}`,
                },
              ],
            };
          },
        );
      },
      {
        serverInfo: {
          name: "nextjs-better-auth-starter",
          version: "1.0.0",
        },
      },
      {
        basePath: "/api",
        maxDuration: 60,
        verboseLogs: process.env.NODE_ENV === "development",
      },
    )(req);
  },
);

function addCorsHeaders(headers: Headers): void {
  if (process.env.NODE_ENV === "development") {
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set(
      "Access-Control-Allow-Headers",
      "authorization, content-type, mcp-protocol-version",
    );
  }
}

function withCors<T extends (req: Request) => Promise<Response>>(route: T): T {
  return (async (req: Request) => {
    const res = await route(req);
    addCorsHeaders(res.headers);
    return res;
  }) as T;
}

export const GET = withCors(handler);
export const POST = withCors(handler);

export async function OPTIONS(_req: NextRequest): Promise<NextResponse> {
  const headers = new Headers();
  addCorsHeaders(headers);
  return new NextResponse(null, { headers });
}
