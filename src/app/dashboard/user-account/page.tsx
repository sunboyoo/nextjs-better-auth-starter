import { db } from "@/db"
import { account, invitation, passkey, session, user, verification } from "@/db/schema"
import { auth } from "@/lib/auth"
import { desc, eq, or } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
	AccountInformationCard,
	InvitationCard,
	PasskeyCard,
	SessionDisplayCard,
	SocialOAuthCard,
	UserInformationCard,
	VTokenCard,
} from "./_components/feature-cards"

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

	const [userRows, accountRows, sessionRows, verificationRows, invitationRows, passkeyRows] =
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
				.from(invitation)
				.where(or(eq(invitation.email, userEmail), eq(invitation.inviterId, userId)))
				.orderBy(desc(invitation.createdAt)),
			db
				.select()
				.from(passkey)
				.where(eq(passkey.userId, userId))
				.orderBy(desc(passkey.createdAt)),
		])

	const socialOAuthRows = accountRows.filter(
		(accountRow) => !nonSocialProviders.has(accountRow.providerId),
	)

	return (
		<div className="w-full space-y-4">
			<div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
				<h1 className="text-2xl font-semibold tracking-tight">User Account</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Feature cards below show your current data snapshots.
				</p>
			</div>
			<div className="flex flex-col gap-4">
				<UserInformationCard userRow={userRows[0]} />
				<AccountInformationCard rows={accountRows} />
				<SessionDisplayCard rows={sessionRows} />
				<SocialOAuthCard rows={socialOAuthRows} />
				<VTokenCard rows={verificationRows} />
				<InvitationCard rows={invitationRows} />
				<PasskeyCard rows={passkeyRows} />
			</div>
		</div>
	)
}
