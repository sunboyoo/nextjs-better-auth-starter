import { db } from "@/db"
import { account, passkey, user, verification } from "@/db/schema"
import { auth } from "@/lib/auth"
import { desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
	CircleUser,
	User,
	Shield,
	Link2,
	AlertTriangle,
	Database,
	Activity
} from "lucide-react"
import {
	AccountInformationCard,
	PasskeyCard,
	SessionDisplayCard,
	SocialOAuthCard,
	UserInformationCard,
	VTokenCard,
} from "./_components/feature-cards"
import { UserNameImageCard } from "./_components/user-name-image-card"
import { UserEmailCard } from "./_components/user-email-card"
import { UserPasswordCard } from "./_components/user-password-card"
import { DeleteUserCard } from "./_components/delete-user-card"
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

	const userId = currentSession.user.id
	const userEmail = currentSession.user.email
	const userName = currentSession.user.name
	const userImage = currentSession.user.image

	const [userRows, accountRows, verificationRows, passkeyRows, activeSessions] =
		await Promise.all([
			db.select().from(user).where(eq(user.id, userId)).limit(1),
			db
				.select()
				.from(account)
				.where(eq(account.userId, userId))
				.orderBy(desc(account.createdAt)),
			db
				.select()
				.from(verification)
				.where(eq(verification.identifier, userEmail))
				.orderBy(desc(verification.createdAt)),
			db
				.select()
				.from(passkey)
				.where(eq(passkey.userId, userId))
				.orderBy(desc(passkey.createdAt)),
			auth.api.listSessions({
				headers: requestHeaders,
			}),
		])

	const socialOAuthRows = accountRows.filter(
		(accountRow) => !nonSocialProviders.has(accountRow.providerId),
	)

	// Check if user has a password (has credential provider)
	const hasPassword = accountRows.some(
		(accountRow) => accountRow.providerId === "credential",
	)

	return (
		<div className="w-full space-y-8">
			{/* Page Header */}
			<div className="rounded-xl border bg-card p-6 md:p-8">
				<div className="flex items-center gap-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
						<CircleUser className="h-6 w-6" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight md:text-3xl">
							Account Overview
						</h1>
						<p className="mt-1 text-sm text-muted-foreground md:text-base">
							View and manage your account details, security settings, and connected services.
						</p>
					</div>
				</div>
			</div>

			{/* Profile Section */}
			<section className="space-y-3">
				<SectionHeader
					title="Profile"
					description="Your personal information and credentials"
					icon={User}
					iconColor="blue"
				/>
				<div className="space-y-4">
					<UserNameImageCard
						userName={userName}
						userEmail={userEmail}
						userImage={userImage}
					/>
					<UserEmailCard
						userEmail={userEmail}
						emailVerified={currentSession.user.emailVerified}
					/>
					<UserPasswordCard
						hasPassword={hasPassword}
					/>
				</div>
			</section>

			{/* Sessions Section */}
			<section className="space-y-3">
				<SectionHeader
					title="Sessions"
					description="Manage your active sessions across devices"
					icon={Activity}
					iconColor="green"
				/>
					<div className="space-y-4">
						<ActiveSessionCard
							sessions={activeSessions}
							currentSessionId={currentSession.session.id}
						/>
					</div>
			</section>

			{/* Security Section */}
			<section className="space-y-3">
				<SectionHeader
					title="Security"
					description="Authentication methods and passkeys"
					icon={Shield}
					iconColor="blue"
				/>
				<div className="space-y-4">
					<PasskeyCard rows={passkeyRows} />
				</div>
			</section>

			{/* Connected Accounts Section */}
			{socialOAuthRows.length > 0 && (
				<section className="space-y-3">
					<SectionHeader
						title="Connected Accounts"
						description="Third-party services linked to your account"
						icon={Link2}
						iconColor="purple"
					/>
					<div className="space-y-4">
						<SocialOAuthCard rows={socialOAuthRows} />
					</div>
				</section>
			)}

			{/* Account Data Section */}
			<section className="space-y-3">
				<SectionHeader
					title="Account Data"
					description="Raw account information for debugging"
					icon={Database}
					iconColor="orange"
				/>
				<div className="space-y-4">
					<UserInformationCard userRow={userRows[0]} />
					<AccountInformationCard rows={accountRows} />
					<VTokenCard rows={verificationRows} />
				</div>
			</section>

			{/* Danger Zone Section */}
			<section className="space-y-3">
				<SectionHeader
					title="Danger Zone"
					description="Irreversible account actions"
					icon={AlertTriangle}
					iconColor="red"
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
