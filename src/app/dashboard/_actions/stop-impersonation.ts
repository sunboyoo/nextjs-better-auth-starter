"use server";

import { headers } from "next/headers";
import { stopImpersonationWithHeaders } from "@/lib/impersonation";

export type StopImpersonationResult =
	| { success: true }
	| { success: false; error: string };

export async function stopImpersonationAction(): Promise<StopImpersonationResult> {
	try {
		const requestHeaders = await headers();
		const result = await stopImpersonationWithHeaders(requestHeaders);
		if (!result.success) {
			return {
				success: false,
				error: result.error,
			};
		}
		return {
			success: true,
		};
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
