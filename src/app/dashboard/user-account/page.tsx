import { db } from "@/db"
import { account, passkey, session, user, verification } from "@/db/schema"
import { auth } from "@/lib/auth"
import { desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { CircleUser } from "lucide-react"
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

	const [userRows, accountRows, sessionRows, verificationRows, passkeyRows] =
		await Promise.all([
			db.select().from(user).where(eq(user.id, userId)).limit(1),
			db
				.select()
				.from(account)
				.where(eq(account.userId, userId))
				.orderBy(desc(account.createdAt)),
			db
				.select()
				.from(session)
				.where(eq(session.userId, userId))
				.orderBy(desc(session.createdAt)),
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
		])

	const socialOAuthRows = accountRows.filter(
		(accountRow) => !nonSocialProviders.has(accountRow.providerId),
	)

	// Check if user has a password (has credential provider)
	const hasPassword = accountRows.some(
		(accountRow) => accountRow.providerId === "credential",
	)



	return (
		<div className="w-full space-y-6">
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

			{/* User Name & Image Card */}
			<UserNameImageCard
				userName={userName}
				userEmail={userEmail}
				userImage={userImage}
			/>

			{/* User Email Card */}
			<UserEmailCard
				userEmail={userEmail}
				emailVerified={currentSession.user.emailVerified}
			/>

			{/* User Password Card */}
			<UserPasswordCard
				hasPassword={hasPassword}
			/>

			{/* Delete User Card */}
			<DeleteUserCard
				hasPassword={hasPassword}
				userEmail={userEmail}
			/>

			{/* Cards */}
			<div className="flex flex-col gap-4">
				<UserInformationCard userRow={userRows[0]} />
				<AccountInformationCard rows={accountRows} />
				<SessionDisplayCard rows={sessionRows} />
				<SocialOAuthCard rows={socialOAuthRows} />
				<VTokenCard rows={verificationRows} />
				<PasskeyCard rows={passkeyRows} />
			</div>
		</div>
	)
}
