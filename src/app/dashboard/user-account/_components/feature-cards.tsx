import { Badge } from "@/components/ui/badge"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

type DataRecord = Record<string, unknown>

type FeatureCardProps = {
	title: string
	description: string
	rows: DataRecord[]
	emptyMessage: string
	recordFields: string[]
}

const SENSITIVE_FIELD_PARTS = [
	"token",
	"password",
	"secret",
	"privatekey",
	"publickey",
	"credentialid",
	"value",
]

function maskValue(value: string) {
	if (!value) return "-"
	if (value.length <= 8) return "********"
	return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function formatValue(field: string, value: unknown) {
	if (value === null || value === undefined) return "-"
	if (value instanceof Date) return value.toISOString()
	if (Array.isArray(value)) return value.length ? value.join(", ") : "-"
	if (typeof value === "boolean") return value ? "true" : "false"
	if (typeof value === "object") {
		try {
			return JSON.stringify(value)
		} catch {
			return "[object]"
		}
	}

	const normalized = field.toLowerCase()
	if (SENSITIVE_FIELD_PARTS.some((part) => normalized.includes(part))) {
		return maskValue(String(value))
	}

	return String(value)
}

function FeatureCard({
	title,
	description,
	rows,
	emptyMessage,
	recordFields,
}: FeatureCardProps) {
	const snapshot = rows.at(0)

	return (
		<Card>
			<CardHeader className="gap-3">
				<div className="flex items-center justify-between gap-2">
					<CardTitle>{title}</CardTitle>
					<Badge variant="secondary">Records: {rows.length}</Badge>
				</div>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<p className="text-xs font-medium text-muted-foreground">
						Latest record snapshot
					</p>
					{snapshot ? (
						<div className="grid gap-2 rounded-md border p-3 text-sm">
							{recordFields.map((field) => (
								<div key={field} className="grid grid-cols-[170px_1fr] gap-2">
									<p className="font-medium text-muted-foreground">{field}</p>
									<p className="break-all">{formatValue(field, snapshot[field])}</p>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">{emptyMessage}</p>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

type UserInformationCardProps = {
	userRow?: DataRecord
}

export function UserInformationCard({ userRow }: UserInformationCardProps) {
	return (
		<FeatureCard
			title="User Information"
			description="Current user record."
			rows={userRow ? [userRow] : []}
			emptyMessage="No user record was found."
			recordFields={[
				"id",
				"name",
				"email",
				"emailVerified",
				"role",
				"twoFactorEnabled",
				"banned",
				"createdAt",
				"updatedAt",
			]}
		/>
	)
}

type AccountInformationCardProps = {
	rows: DataRecord[]
}

export function AccountInformationCard({ rows }: AccountInformationCardProps) {
	return (
		<FeatureCard
			title="Account Information"
			description="Linked account records."
			rows={rows}
			emptyMessage="No account records are linked to this user."
			recordFields={[
				"id",
				"providerId",
				"accountId",
				"userId",
				"scope",
				"accessTokenExpiresAt",
				"refreshTokenExpiresAt",
				"createdAt",
				"updatedAt",
			]}
		/>
	)
}

type SessionDisplayCardProps = {
	rows: DataRecord[]
}

export function SessionDisplayCard({ rows }: SessionDisplayCardProps) {
	return (
		<FeatureCard
			title="Session Display"
			description="Active and historical session records."
			rows={rows}
			emptyMessage="No session records were found."
			recordFields={[
				"id",
				"userId",
				"expiresAt",
				"ipAddress",
				"userAgent",
				"impersonatedBy",
				"activeOrganizationId",
				"createdAt",
				"updatedAt",
			]}
		/>
	)
}

type SocialOAuthCardProps = {
	rows: DataRecord[]
}

export function SocialOAuthCard({ rows }: SocialOAuthCardProps) {
	return (
		<FeatureCard
			title="Social OAuth"
			description="Connected social provider accounts."
			rows={rows}
			emptyMessage="No social OAuth account is currently linked."
			recordFields={[
				"id",
				"providerId",
				"accountId",
				"userId",
				"scope",
				"createdAt",
				"updatedAt",
			]}
		/>
	)
}

type VTokenCardProps = {
	rows: DataRecord[]
}

export function VTokenCard({ rows }: VTokenCardProps) {
	return (
		<FeatureCard
			title="VToken"
			description="Verification token records."
			rows={rows}
			emptyMessage="No verification token records were found for this user email."
			recordFields={["id", "identifier", "value", "expiresAt", "createdAt", "updatedAt"]}
		/>
	)
}

type InvitationCardProps = {
	rows: DataRecord[]
}

export function InvitationCard({ rows }: InvitationCardProps) {
	return (
		<FeatureCard
			title="Invitation"
			description="Organization invitation records."
			rows={rows}
			emptyMessage="No invitation records were found for this user."
			recordFields={[
				"id",
				"organizationId",
				"email",
				"role",
				"status",
				"expiresAt",
				"createdAt",
				"inviterId",
			]}
		/>
	)
}

type PasskeyCardProps = {
	rows: DataRecord[]
}

export function PasskeyCard({ rows }: PasskeyCardProps) {
	return (
		<FeatureCard
			title="Passkey"
			description="Registered passkey records."
			rows={rows}
			emptyMessage="No passkey records were found."
			recordFields={[
				"id",
				"name",
				"userId",
				"credentialID",
				"counter",
				"deviceType",
				"backedUp",
				"transports",
				"createdAt",
				"aaguid",
			]}
		/>
	)
}
