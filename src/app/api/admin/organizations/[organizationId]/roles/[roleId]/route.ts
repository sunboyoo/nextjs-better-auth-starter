import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationRole } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; roleId: string }> }
) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const { organizationId, roleId } = await params;

    try {
        // Verify role belongs to organization before deleting
        const result = await db
            .delete(organizationRole)
            .where(
                and(
                    eq(organizationRole.id, roleId),
                    eq(organizationRole.organizationId, organizationId)
                )
            )
            .returning({ id: organizationRole.id });

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Role not found in this organization" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "delete role");
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; roleId: string }> }
) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const { organizationId, roleId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            role: z.string().trim().min(1).max(100).optional(),
            permission: z.string().trim().max(10000).optional().nullable(),
        });
        const result = schema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.issues }, { status: 400 });
        }
        const { role, permission } = result.data;

        const updateData: Partial<typeof organizationRole.$inferInsert> = {};
        if (role) updateData.role = role;
        if (permission) updateData.permission = permission;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        // Verify role belongs to organization and update
        const updatedRole = await db
            .update(organizationRole)
            .set(updateData)
            .where(
                and(
                    eq(organizationRole.id, roleId),
                    eq(organizationRole.organizationId, organizationId)
                )
            )
            .returning();

        if (updatedRole.length === 0) {
            return NextResponse.json(
                { error: "Role not found in this organization" },
                { status: 404 }
            );
        }

        return NextResponse.json({ role: updatedRole[0] });
    } catch (error) {
        return handleApiError(error, "update role");
    }
}
