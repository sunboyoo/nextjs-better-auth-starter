import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUsers } from "@/utils/users";
import { handleApiError } from "@/lib/api/error-handler";
import { requireAdminAction } from "@/lib/api/auth-guard";
import { parsePagination } from "@/lib/api/pagination";
import { extendedAuthApi } from "@/lib/auth-api";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().optional(),
  role: z.union([z.string(), z.array(z.string())]).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAction("users.list");
    if (!authResult.success) return authResult.response;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, offset } = parsePagination(request);
    const sortBy = searchParams.get("sortBy") || undefined;
    let sortDirection = searchParams.get("sortDirection") || undefined;
    if (sortDirection !== "asc" && sortDirection !== "desc") {
      sortDirection = undefined;
    }
    const role = searchParams.get("role") || undefined;
    const status = searchParams.get("status") || undefined;
    const email = searchParams.get("email") || undefined;
    const name = searchParams.get("name") || undefined;

    // Pass all filters and sort to getUsers
    const { users, total } = await getUsers({
      limit,
      offset,
      sortBy,
      sortDirection,
      role,
      status,
      email,
      name,
    });

    return NextResponse.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleApiError(error, "fetch users");
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminAction("users.create");
  if (!authResult.success) return authResult.response;

  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const result = await extendedAuthApi.createUser({
      body: parsed.data,
      headers: authResult.headers,
    });

    const createdUserId =
      (result as { user?: { id?: string } } | null)?.user?.id ?? null;
    await writeAdminAuditLog({
      actorUserId: authResult.user.id,
      action: "admin.users.create",
      targetType: "user",
      targetId: createdUserId,
      metadata: {
        email: parsed.data.email,
        role: parsed.data.role ?? "user",
      },
      headers: authResult.headers,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "create user");
  }
}
