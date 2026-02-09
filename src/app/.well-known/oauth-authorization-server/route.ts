import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
	const metadataUrl = new URL(
		"/api/auth/.well-known/oauth-authorization-server",
		request.url,
	);
	const upstream = await fetch(metadataUrl, {
		method: "GET",
		cache: "no-store",
	});
	const config = await upstream.json().catch(() => null);
	if (!upstream.ok || config === null) {
		return NextResponse.json(
			{ error: "Failed to load OAuth authorization server metadata." },
			{ status: upstream.status || 500 },
		);
	}
	const headers = new Headers();
	if (process.env.NODE_ENV === "development") {
		headers.set("Access-Control-Allow-Methods", "GET");
		headers.set("Access-Control-Allow-Origin", "*");
		headers.set(
			"Cache-Control",
			"public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
		);
	}
	return NextResponse.json(config, {
		headers,
	});
}
