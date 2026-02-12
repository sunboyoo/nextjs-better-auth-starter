"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { extendedAuthApi } from "@/lib/auth-api";

type StopImpersonationResult =
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

		if (!sessionData?.impersonatedBy) {
			return {
				success: false,
				error: "No active impersonation session found.",
			};
		}

		await extendedAuthApi.stopImpersonating({
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
