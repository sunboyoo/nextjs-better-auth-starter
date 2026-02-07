"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

type StopImpersonationResult =
	| { success: true }
	| { success: false; error: string };

export async function stopImpersonationAction(): Promise<StopImpersonationResult> {
	try {
		const requestHeaders = await headers();
		const session = await auth.api.getSession({
			headers: requestHeaders,
		});

		if (!session?.session.impersonatedBy) {
			return {
				success: false,
				error: "No active impersonation session found.",
			};
		}

		await auth.api.stopImpersonating({
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
