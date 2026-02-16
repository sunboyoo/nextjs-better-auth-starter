import "server-only";

import { writeAdminAuditLog } from "@/lib/api/admin-audit";
import { extendedAuthApi } from "@/lib/auth-api";
import { auth } from "@/lib/auth";

export type StopImpersonationWithHeadersResult =
	| { success: true; actorUserId: string; targetUserId: string }
	| { success: false; status: number; error: string };

export async function stopImpersonationWithHeaders(
	requestHeaders: Headers,
): Promise<StopImpersonationWithHeadersResult> {
	const session = await auth.api.getSession({
		headers: requestHeaders,
	});
	const sessionData = session?.session as
		| { impersonatedBy?: string | null }
		| undefined;

	if (!session) {
		return {
			success: false,
			status: 401,
			error: "You must be signed in to stop impersonation.",
		};
	}

	if (!sessionData?.impersonatedBy) {
		return {
			success: false,
			status: 400,
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

	return {
		success: true,
		actorUserId: sessionData.impersonatedBy,
		targetUserId: session.user.id,
	};
}
