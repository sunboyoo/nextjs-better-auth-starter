import { Badge } from "@/components/ui/badge"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	CircleUser,
	Key,
	KeyRound,
	type LucideIcon,
	MonitorSmartphone,
	Share2,
	ShieldCheck,
} from "lucide-react"

type DataRecord = Record<string, unknown>

type DisplayField = {
	key: string
	label: string
}

type FeatureCardProps = {
	title: string
	description: string
	rows: DataRecord[]
	emptyMessage: string
	recordFields: DisplayField[]
	icon?: LucideIcon
	iconColor?: string
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

function formatDateValue(value: Date) {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(value)
}

function formatProviderId(value: string) {
	return value
		.split(/[-_]/g)
		.filter(Boolean)
		.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
		.join(" ")
}

function formatValue(key: string, value: unknown) {
	if (value === null || value === undefined) return "-"
	if (value instanceof Date) return formatDateValue(value)
	if (Array.isArray(value)) return value.length ? value.join(", ") : "-"
	if (typeof value === "boolean") return value ? "Yes" : "No"
	if (typeof value === "object") {
		try {
			return JSON.stringify(value)
		} catch {
			return "[data]"
		}
	}

	const normalizedKey = key.toLowerCase()
	if (SENSITIVE_FIELD_PARTS.some((part) => normalizedKey.includes(part))) {
		return maskValue(String(value))
	}

	if (normalizedKey === "providerid") {
		return formatProviderId(String(value))
	}

	return String(value)
}

function FeatureCard({
	title,
	description,
	rows,
	emptyMessage,
	recordFields,
	icon: Icon,
	iconColor = "text-primary",
}: FeatureCardProps) {
	const snapshot = rows.at(0)

	return (
		<Card className="overflow-hidden transition-all hover:shadow-md">
			<CardHeader className="gap-3 bg-muted/30">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-3">
						{Icon && (
							<div
								className={`flex h-10 w-10 items-center justify-center rounded-lg bg-background shadow-sm ${iconColor}`}
							>
								<Icon className="h-5 w-5" />
							</div>
						)}
						<div>
							<CardTitle className="text-lg">{title}</CardTitle>
							<CardDescription className="mt-1">{description}</CardDescription>
						</div>
					</div>
					<Badge
						variant={rows.length > 0 ? "default" : "secondary"}
						className="shrink-0"
					>
						{rows.length} {rows.length === 1 ? "record" : "records"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="p-0">
				{snapshot ? (
					<div className="divide-y">
						<div className="bg-muted/10 px-6 py-3">
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Most Recent
							</p>
						</div>
						<div className="grid gap-0 divide-y">
							{recordFields.map((field) => {
								const value = formatValue(field.key, snapshot[field.key])
								const isEmpty = value === "-"
								return (
									<div
										key={field.key}
										className="grid grid-cols-[180px_1fr] items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/20 sm:grid-cols-[220px_1fr]"
									>
										<p className="text-sm font-medium text-muted-foreground">
											{field.label}
										</p>
										<p
											className={`break-all text-sm ${isEmpty ? "text-muted-foreground/60 italic" : ""}`}
										>
											{value}
										</p>
									</div>
								)
							})}
						</div>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
						{Icon && (
							<div
								className={`flex h-12 w-12 items-center justify-center rounded-full bg-muted ${iconColor} opacity-50`}
							>
								<Icon className="h-6 w-6" />
							</div>
						)}
						<p className="text-sm text-muted-foreground">{emptyMessage}</p>
					</div>
				)}
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
			icon={CircleUser}
			iconColor="text-blue-600 dark:text-blue-400"
			title="Personal Details"
			description="Basic details for your account profile."
			rows={userRow ? [userRow] : []}
			emptyMessage="We could not find your profile details."
			recordFields={[
				{ key: "id", label: "User ID" },
				{ key: "name", label: "Full name" },
				{ key: "email", label: "Email address" },
				{ key: "emailVerified", label: "Email confirmed" },
				{ key: "role", label: "Access level" },
				{ key: "twoFactorEnabled", label: "2-step security enabled" },
				{ key: "banned", label: "Account blocked" },
				{ key: "createdAt", label: "Joined on" },
				{ key: "updatedAt", label: "Last profile update" },
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
			icon={Key}
			iconColor="text-amber-600 dark:text-amber-400"
			title="Sign-In Methods"
			description="How your account can be used to sign in."
			rows={rows}
			emptyMessage="No sign-in methods are linked to your account yet."
			recordFields={[
				{ key: "id", label: "Link ID" },
				{ key: "providerId", label: "Sign-in method" },
				{ key: "accountId", label: "Provider account ID" },
				{ key: "userId", label: "User ID" },
				{ key: "scope", label: "Permissions granted" },
				{ key: "accessTokenExpiresAt", label: "Access expires" },
				{ key: "refreshTokenExpiresAt", label: "Refresh expires" },
				{ key: "createdAt", label: "Linked on" },
				{ key: "updatedAt", label: "Last link update" },
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
			icon={MonitorSmartphone}
			iconColor="text-green-600 dark:text-green-400"
			title="Sign-In Activity"
			description="Recent and past logins for your account."
			rows={rows}
			emptyMessage="No sign-in activity was found."
			recordFields={[
				{ key: "id", label: "Session ID" },
				{ key: "userId", label: "User ID" },
				{ key: "expiresAt", label: "Session ends" },
				{ key: "ipAddress", label: "Network address" },
				{ key: "userAgent", label: "Device and browser" },
				{ key: "impersonatedBy", label: "Signed in by admin" },
				{ key: "activeOrganizationId", label: "Current organization" },
				{ key: "createdAt", label: "Started on" },
				{ key: "updatedAt", label: "Last activity" },
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
			icon={Share2}
			iconColor="text-purple-600 dark:text-purple-400"
			title="Connected Social Accounts"
			description="Social apps currently connected to your login."
			rows={rows}
			emptyMessage="You have not connected any social account yet."
			recordFields={[
				{ key: "id", label: "Connection ID" },
				{ key: "providerId", label: "Social app" },
				{ key: "accountId", label: "Social account ID" },
				{ key: "userId", label: "User ID" },
				{ key: "scope", label: "Permissions granted" },
				{ key: "createdAt", label: "Connected on" },
				{ key: "updatedAt", label: "Last connection update" },
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
			icon={ShieldCheck}
			iconColor="text-rose-600 dark:text-rose-400"
			title="Verification Requests"
			description="Recent verification records for your email."
			rows={rows}
			emptyMessage="No verification requests were found for your email."
			recordFields={[
				{ key: "id", label: "Verification ID" },
				{ key: "identifier", label: "Email or identifier" },
				{ key: "value", label: "Verification code (hidden)" },
				{ key: "expiresAt", label: "Expires on" },
				{ key: "createdAt", label: "Created on" },
				{ key: "updatedAt", label: "Last update" },
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
			icon={KeyRound}
			iconColor="text-cyan-600 dark:text-cyan-400"
			title="Passkeys"
			description="Password-free sign-in keys for your account."
			rows={rows}
			emptyMessage="No passkeys are registered yet."
			recordFields={[
				{ key: "id", label: "Passkey ID" },
				{ key: "name", label: "Passkey name" },
				{ key: "userId", label: "User ID" },
				{ key: "credentialID", label: "Credential ID" },
				{ key: "counter", label: "Use counter" },
				{ key: "deviceType", label: "Device type" },
				{ key: "backedUp", label: "Backed up" },
				{ key: "transports", label: "Connection method" },
				{ key: "createdAt", label: "Added on" },
				{ key: "aaguid", label: "Authenticator model ID" },
			]}
		/>
	)
}
