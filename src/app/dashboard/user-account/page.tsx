import { auth, configuredSocialProviderIds } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
	CircleUser,
	User,
	KeyRound,
	ShieldCheck,
	AlertTriangle,
} from "lucide-react"
import { UserOAuthCard } from "./_components/user-oauth-card"
import { UserPasskeyCard } from "./_components/user-passkey-card"
import { UserTwoFactorCard } from "./_components/user-two-factor-card"
import { UserNameImageCard } from "./_components/user-name-image-card"
import { UserEmailCard } from "./_components/user-email-card"
import { UserPasswordCard } from "./_components/user-password-card"
import { DeleteUserCard } from "./_components/delete-user-card"
import { UserRoleCard } from "./_components/user-role-card"
import { SectionHeader } from "./_components/section-header"
import { ActiveSessionCard } from "./_components/active-session-card"

const nonSocialProviders = new Set(["credential", "email-password"])

export default async function UserAccountPage() {
	const requestHeaders = await headers()
	const currentSession = await auth.api.getSession({
		headers: requestHeaders,
	})

	if (!currentSession) {
		redirect("/auth/sign-in?callbackUrl=/dashboard/user-account")
	}

	const userEmail = currentSession.user.email
	const userName = currentSession.user.name
	const userUsername = currentSession.user.username
	const userImage = currentSession.user.image

	const [accountRows, passkeyRows, activeSessions] =
		await Promise.all([
			auth.api.listUserAccounts({
				headers: requestHeaders,
			}),
			auth.api.listPasskeys({
				headers: requestHeaders,
			}),
			auth.api.listSessions({
				headers: requestHeaders,
			}),
		])

	const socialOAuthAccounts = accountRows
		.filter((row) => !nonSocialProviders.has(row.providerId))
		.map((row) => ({
			id: row.id,
			providerId: row.providerId,
			accountId: row.accountId,
			createdAt: row.createdAt,
		}))

	// Check if user has a password (has credential provider)
	const hasPassword = accountRows.some(
		(accountRow) => accountRow.providerId === "credential",
	)

	return (
		<div className="w-full space-y-8">
			{/* Page Header */}
			<div className="rounded-xl border-0 shadow-none bg-card p-6 md:p-8">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 shadow-sm dark:bg-indigo-900/30 dark:text-indigo-400">
						<CircleUser className="h-5 w-5" />
					</div>
					<div>
						<h1 className="text-base font-bold tracking-tight md:text-lg">
							Account Overview
						</h1>
						<p className="mt-1 text-xs text-muted-foreground md:text-sm">
							View and manage your account details, security settings, and connected services.
						</p>
					</div>
				</div>
			</div>

			{/* ── Section 1: Profile & Identity ── */}
			<section className="space-y-3">
				<SectionHeader
					title="Profile & Identity"
					description="Your personal information, email, and platform role"
				/>
				<div className="space-y-4">
					<UserNameImageCard
						userName={userName}
						userUsername={userUsername}
						userEmail={userEmail}
						userImage={userImage}
					/>
					<UserEmailCard
						userEmail={userEmail}
						emailVerified={currentSession.user.emailVerified}
					/>
					<UserRoleCard
						userRole={currentSession.user.role}
						userEmail={userEmail}
						userName={userName}
					/>
				</div>
			</section>

			{/* ── Section 2: Sign-in Methods ── */}
			<section className="space-y-3">
				<SectionHeader
					title="Sign-in Methods"
					description="Manage how you sign in to your account"
				/>
				<div className="space-y-4">
					<UserPasswordCard
						hasPassword={hasPassword}
					/>
					{configuredSocialProviderIds.length > 0 && (
						<UserOAuthCard
							availableProviders={configuredSocialProviderIds}
							linkedAccounts={socialOAuthAccounts}
							accountCount={accountRows.length}
						/>
					)}
					<UserPasskeyCard initialPasskeys={passkeyRows} />
				</div>
			</section>

			{/* ── Section 3: Security ── */}
			<section className="space-y-3">
				<SectionHeader
					title="Security"
					description="Two-factor authentication and active sessions"
				/>
				<div className="space-y-4">
					<UserTwoFactorCard twoFactorEnabled={!!currentSession.user.twoFactorEnabled} />
					<ActiveSessionCard
						sessions={activeSessions}
						currentSessionId={currentSession.session.id}
					/>
				</div>
			</section>

			{/* ── Section 4: Danger Zone ── */}
			<section className="space-y-3">
				<SectionHeader
					title="Danger Zone"
					description="Irreversible account actions"
				/>
				<div className="space-y-4">
					<DeleteUserCard
						hasPassword={hasPassword}
						userEmail={userEmail}
					/>
				</div>
			</section>
		</div>
	)
}
