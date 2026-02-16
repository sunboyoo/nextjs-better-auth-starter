import "dotenv/config";

import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../src/db";
import { adminAuditLog } from "../src/db/schema";

/**
 * End-to-end impersonation validation script.
 *
 * Required:
 * - `E2E_ADMIN_EMAIL`
 * - `E2E_ADMIN_PASSWORD`
 *
 * Optional:
 * - `E2E_BASE_URL` (default: BETTER_AUTH_URL/NEXT_PUBLIC_APP_URL/http://localhost:3000)
 * - `E2E_IMPERSONATION_ADMIN_EMAIL`
 * - `E2E_IMPERSONATION_ADMIN_PASSWORD`
 * - `E2E_IMPERSONATION_TARGET_EMAIL`
 * - `E2E_IMPERSONATION_TARGET_NAME`
 * - `E2E_IMPERSONATION_TARGET_PASSWORD`
 * - `E2E_IMPERSONATION_CREATE_TARGET_IF_MISSING` (default: true)
 *
 * Run:
 * - `npm run test:e2e:impersonation`
 */

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type RequestWithCookiesOptions = {
	method?: HttpMethod;
	body?: unknown;
	headers?: Record<string, string>;
	followRedirects?: boolean;
	redirectCount?: number;
};

type AdminUserRecord = {
	id: string;
	email: string;
	role?: string;
};

type AdminUsersApiResponse = {
	users: AdminUserRecord[];
	currentUserId?: string;
};

class CookieJar {
	private readonly values = new Map<string, string>();

	toHeader(): string | null {
		if (this.values.size === 0) return null;
		return Array.from(this.values.entries())
			.map(([name, value]) => `${name}=${value}`)
			.join("; ");
	}

	capture(headers: Headers) {
		const setCookieHeaders = this.getSetCookieHeaders(headers);
		for (const headerValue of setCookieHeaders) {
			const [cookiePair] = headerValue.split(";");
			if (!cookiePair) continue;
			const separatorIndex = cookiePair.indexOf("=");
			if (separatorIndex <= 0) continue;

			const name = cookiePair.slice(0, separatorIndex).trim();
			const value = cookiePair.slice(separatorIndex + 1).trim();
			if (!name) continue;

			if (!value || value.toLowerCase() === "deleted") {
				this.values.delete(name);
				continue;
			}

			this.values.set(name, value);
		}
	}

	private getSetCookieHeaders(headers: Headers): string[] {
		const typedHeaders = headers as Headers & {
			getSetCookie?: () => string[];
		};

		if (typeof typedHeaders.getSetCookie === "function") {
			return typedHeaders.getSetCookie();
		}

		const singleValue = headers.get("set-cookie");
		return singleValue ? [singleValue] : [];
	}
}

function getRequiredEnv(key: string): string {
	const value = process.env[key]?.trim();
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}

function normalizeBaseUrl(value: string): string {
	return value.trim().replace(/\/+$/, "");
}

function isRedirectStatus(status: number): boolean {
	return (
		status === 301 ||
		status === 302 ||
		status === 303 ||
		status === 307 ||
		status === 308
	);
}

async function readResponseBody(
	response: Response,
): Promise<{ text: string; json: unknown | null }> {
	const text = await response.text();
	if (!text) {
		return { text, json: null };
	}

	try {
		return { text, json: JSON.parse(text) as unknown };
	} catch {
		return { text, json: null };
	}
}

async function requestWithCookies(
	baseUrl: string,
	cookieJar: CookieJar,
	pathname: string,
	options: RequestWithCookiesOptions = {},
): Promise<Response> {
	const {
		method = options.body === undefined ? "GET" : "POST",
		body,
		headers: extraHeaders,
		followRedirects = true,
		redirectCount = 0,
	} = options;

	const headers = new Headers(extraHeaders ?? {});
	const cookieHeader = cookieJar.toHeader();
	if (cookieHeader) {
		headers.set("cookie", cookieHeader);
	}
	if (!headers.has("accept")) {
		headers.set("accept", "application/json, text/html;q=0.9, */*;q=0.8");
	}
	if (body !== undefined && !headers.has("content-type")) {
		headers.set("content-type", "application/json");
	}
	if (!headers.has("origin")) {
		headers.set("origin", baseUrl);
	}
	if (!headers.has("referer")) {
		headers.set("referer", `${baseUrl}/`);
	}

	const response = await fetch(new URL(pathname, baseUrl), {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
		redirect: "manual",
	});

	cookieJar.capture(response.headers);

	if (!followRedirects || !isRedirectStatus(response.status)) {
		return response;
	}

	const location = response.headers.get("location");
	if (!location) {
		return response;
	}
	if (redirectCount >= 10) {
		throw new Error(`Too many redirects while requesting ${pathname}`);
	}

	const redirectUrl = new URL(location, baseUrl);
	const nextPath = `${redirectUrl.pathname}${redirectUrl.search}`;
	const nextMethod = response.status === 303 ? "GET" : method;

	return requestWithCookies(baseUrl, cookieJar, nextPath, {
		method: nextMethod,
		followRedirects: true,
		redirectCount: redirectCount + 1,
	});
}

async function requestJson<T>(
	baseUrl: string,
	cookieJar: CookieJar,
	pathname: string,
	options: RequestWithCookiesOptions = {},
): Promise<T> {
	const response = await requestWithCookies(baseUrl, cookieJar, pathname, options);
	const parsed = await readResponseBody(response);

	if (!response.ok) {
		const errorMessage =
			parsed.json &&
			typeof parsed.json === "object" &&
			parsed.json !== null &&
			"error" in parsed.json &&
			typeof (parsed.json as { error?: unknown }).error === "string"
				? (parsed.json as { error: string }).error
				: `Request failed with status ${response.status}`;
		throw new Error(`${pathname}: ${errorMessage}`);
	}

	if (parsed.json === null) {
		throw new Error(`${pathname}: expected JSON response but received plain text`);
	}

	return parsed.json as T;
}

async function requestText(
	baseUrl: string,
	cookieJar: CookieJar,
	pathname: string,
): Promise<string> {
	const response = await requestWithCookies(baseUrl, cookieJar, pathname, {
		method: "GET",
	});
	const { text } = await readResponseBody(response);

	if (!response.ok) {
		throw new Error(`${pathname}: expected 2xx but received ${response.status}`);
	}

	return text;
}

async function getAuditCount(
	action: string,
	actorUserId: string,
	targetUserId: string,
	since: Date,
): Promise<number> {
	const rows = await db
		.select({
			count: sql<number>`count(*)`,
		})
		.from(adminAuditLog)
		.where(
			and(
				eq(adminAuditLog.action, action),
				eq(adminAuditLog.actorUserId, actorUserId),
				eq(adminAuditLog.targetType, "user"),
				eq(adminAuditLog.targetId, targetUserId),
				gte(adminAuditLog.createdAt, since),
			),
		);

	return Number(rows[0]?.count ?? 0);
}

function findUserByEmail(users: AdminUserRecord[], email: string): AdminUserRecord | null {
	const normalizedEmail = email.trim().toLowerCase();
	return (
		users.find((user) => user.email.trim().toLowerCase() === normalizedEmail) ?? null
	);
}

async function main() {
	if (
		process.env.BETTER_AUTH_CAPTCHA_ENABLED === "true" ||
		process.env.NEXT_PUBLIC_BETTER_AUTH_CAPTCHA_ENABLED === "true"
	) {
		throw new Error(
			"Captcha is enabled. Disable captcha for this e2e flow or provide a dedicated non-captcha test profile.",
		);
	}

	const baseUrl = normalizeBaseUrl(
		process.env.E2E_BASE_URL ||
			process.env.BETTER_AUTH_URL ||
			process.env.NEXT_PUBLIC_APP_URL ||
			"http://localhost:3000",
	);

	const adminEmail =
		process.env.E2E_IMPERSONATION_ADMIN_EMAIL?.trim() ||
		getRequiredEnv("E2E_ADMIN_EMAIL");
	const adminPassword =
		process.env.E2E_IMPERSONATION_ADMIN_PASSWORD?.trim() ||
		getRequiredEnv("E2E_ADMIN_PASSWORD");

	const targetEmail =
		process.env.E2E_IMPERSONATION_TARGET_EMAIL?.trim() ||
		"impersonation-e2e-target@example.com";
	const targetName =
		process.env.E2E_IMPERSONATION_TARGET_NAME?.trim() || "Impersonation E2E Target";
	const targetPassword =
		process.env.E2E_IMPERSONATION_TARGET_PASSWORD?.trim() || "ImpersonationE2E!123";
	const createTargetIfMissing =
		process.env.E2E_IMPERSONATION_CREATE_TARGET_IF_MISSING !== "false";

	if (adminEmail.toLowerCase() === targetEmail.toLowerCase()) {
		throw new Error("Target email must be different from admin email.");
	}

	const cookieJar = new CookieJar();

	console.log(`[impersonation-e2e] Base URL: ${baseUrl}`);
	console.log(`[impersonation-e2e] Signing in admin: ${adminEmail}`);

	await requestJson(baseUrl, cookieJar, "/api/auth/sign-in/email", {
		method: "POST",
		body: {
			email: adminEmail,
			password: adminPassword,
			rememberMe: true,
		},
	});

	console.log("[impersonation-e2e] Admin sign-in successful");

	let usersPayload = await requestJson<AdminUsersApiResponse>(
		baseUrl,
		cookieJar,
		`/api/admin/users?limit=20&email=${encodeURIComponent(targetEmail)}`,
	);

	const adminUserId = usersPayload.currentUserId;
	if (!adminUserId) {
		throw new Error("Unable to resolve current admin user id from /api/admin/users.");
	}

	let targetUser = findUserByEmail(usersPayload.users ?? [], targetEmail);
	if (!targetUser && createTargetIfMissing) {
		console.log(
			`[impersonation-e2e] Target user not found, creating: ${targetEmail}`,
		);

		await requestJson(baseUrl, cookieJar, "/api/admin/users", {
			method: "POST",
			body: {
				name: targetName,
				email: targetEmail,
				password: targetPassword,
				role: "user",
			},
		});

		usersPayload = await requestJson<AdminUsersApiResponse>(
			baseUrl,
			cookieJar,
			`/api/admin/users?limit=20&email=${encodeURIComponent(targetEmail)}`,
		);
		targetUser = findUserByEmail(usersPayload.users ?? [], targetEmail);
	}

	if (!targetUser) {
		throw new Error(
			`Target user not found for ${targetEmail}. Set E2E_IMPERSONATION_TARGET_EMAIL or enable auto-create.`,
		);
	}

	const targetUserId = targetUser.id;
	const testStartAt = new Date();

	console.log(
		`[impersonation-e2e] Starting impersonation admin=${adminUserId} target=${targetUserId}`,
	);

	await requestJson(baseUrl, cookieJar, `/api/admin/users/${encodeURIComponent(targetUserId)}`, {
		method: "PATCH",
		body: {
			action: "impersonate",
		},
	});

	const impersonatedProfileHtml = await requestText(
		baseUrl,
		cookieJar,
		"/dashboard/user-profile",
	);
	if (!impersonatedProfileHtml.includes("Impersonation mode is active")) {
		throw new Error(
			"Expected impersonation banner text on /dashboard/user-profile after impersonation.",
		);
	}

	console.log("[impersonation-e2e] Impersonation banner verified");

	await requestJson<{ success: boolean }>(
		baseUrl,
		cookieJar,
		"/api/user/impersonation/stop",
		{
			method: "POST",
		},
	);

	console.log("[impersonation-e2e] Stop impersonation endpoint succeeded");

	const restoredProfileHtml = await requestText(
		baseUrl,
		cookieJar,
		"/dashboard/user-profile",
	);
	if (restoredProfileHtml.includes("Impersonation mode is active")) {
		throw new Error(
			"Impersonation banner is still visible after stop impersonation.",
		);
	}

	await requestJson<AdminUsersApiResponse>(baseUrl, cookieJar, "/api/admin/users?limit=1");

	const impersonateAuditCount = await getAuditCount(
		"admin.users.impersonate",
		adminUserId,
		targetUserId,
		testStartAt,
	);
	const stopAuditCount = await getAuditCount(
		"admin.users.impersonation.stop",
		adminUserId,
		targetUserId,
		testStartAt,
	);

	if (impersonateAuditCount < 1) {
		throw new Error("Missing audit log entry for admin.users.impersonate");
	}
	if (stopAuditCount < 1) {
		throw new Error("Missing audit log entry for admin.users.impersonation.stop");
	}

	console.log("[impersonation-e2e] PASS");
	console.log(
		`[impersonation-e2e] Audit entries created: start=${impersonateAuditCount}, stop=${stopAuditCount}`,
	);
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`[impersonation-e2e] FAIL: ${message}`);
	process.exit(1);
});
