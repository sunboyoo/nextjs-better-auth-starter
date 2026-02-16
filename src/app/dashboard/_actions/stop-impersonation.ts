"use server";

import { headers } from "next/headers";
import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { extendedAuthApi } from "@/lib/auth-api";
import { auth } from "@/lib/auth";

export type StopImpersonationResult =
	| { success: true }
	| { success: false; error: string };

export async function stopImpersonationAction(): Promise<StopImpersonationResult> {
	try {
		const requestHeaders = await headers();
		const session = await auth.api.getSession({
			headers: requestHeaders,
		});
		const sessionData = session?.session as
			| { impersonatedBy?: string | null }
			| undefined;

		if (!session) {
			return {
				success: false,
				error: "You must be signed in to stop impersonation.",
			};
		}

		if (!sessionData?.impersonatedBy) {
			return {
				success: false,
				error: "No active impersonation session found.",
			};
		}

		await extendedAuthApi.stopImpersonating({
			headers: requestHeaders,
		});

		await writeAdminAuditLog({
			actorUserId: sessionData.impersonatedBy,
			action: "admin.users.impersonation.stop",
			targetType: "user",
			targetId: session.user.id,
			headers: requestHeaders,
		});

		return { success: true };
	} catch (error: unknown) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to stop impersonation.",
		};
	}
}
