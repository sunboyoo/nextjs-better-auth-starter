import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { member, organization } from "@/db/schema";
import { withUpdatedAt } from "@/db/with-updated-at";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/api/auth-guard";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; memberId: string }> }
) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const { organizationId, memberId } = await params;

    try {
        // Verify member belongs to this organization before deleting
        const result = await db
            .delete(member)
            .where(
                and(
                    eq(member.id, memberId),
                    eq(member.organizationId, organizationId)
                )
            )
            .returning({ id: member.id });

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Member not found in this organization" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "remove member");
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ organizationId: string; memberId: string }> }
) {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;

    const { organizationId, memberId } = await params;

    try {
        const body = await request.json();
        const schema = z.object({
            role: z.string().trim().min(1).max(100),
        });
        const parseResult = schema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({ error: parseResult.error.issues }, { status: 400 });
        }
        const { role: newRole } = parseResult.data;

        if (!newRole) {
            return NextResponse.json({ error: "Role is required" }, { status: 400 });
        }

        // Verify member belongs to this organization and update
        const updateResult = await db
            .update(member)
            .set(withUpdatedAt({ role: newRole }))
            .where(
                and(
                    eq(member.id, memberId),
                    eq(member.organizationId, organizationId)
                )
            )
            .returning({ id: member.id });

        if (updateResult.length === 0) {
            return NextResponse.json(
                { error: "Member not found in this organization" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error, "update member role");
    }
}
