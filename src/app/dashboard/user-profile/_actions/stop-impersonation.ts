"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const impersonationApi = auth.api as unknown as {
	stopImpersonating: (input: { headers: Headers }) => Promise<unknown>;
};

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

		await impersonationApi.stopImpersonating({
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
