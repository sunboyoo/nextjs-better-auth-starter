import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { handleApiError } from "@/lib/api/error-handler";
import { stopImpersonationWithHeaders } from "@/lib/impersonation";

export async function POST() {
	try {
		const requestHeaders = await headers();
		const result = await stopImpersonationWithHeaders(requestHeaders);

		if (!result.success) {
			return NextResponse.json(
				{
					error: result.error,
				},
				{ status: result.status },
			);
		}

		return NextResponse.json({
			success: true,
		});
	} catch (error) {
		return handleApiError(error, "stop impersonation");
	}
}
