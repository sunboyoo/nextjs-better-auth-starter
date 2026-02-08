import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Crown, Shield, User } from "lucide-react"

interface UserRoleCardProps {
	userRole: string | null | undefined
	userEmail: string
	userName: string | null | undefined
}

const ROLE_CONFIG: Record<
	string,
	{
		label: string
		description: string
		icon: typeof Shield
		badgeClass: string
		iconBgClass: string
	}
> = {
	admin: {
		label: "Admin",
		description:
			"Full platform access. Can manage users, organizations, and all system settings.",
		icon: Crown,
		badgeClass:
			"bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700",
		iconBgClass:
			"border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950",
	},
	user: {
		label: "User",
		description:
			"Standard account access. Can manage your own profile, sessions, and organization memberships.",
		icon: User,
		badgeClass:
			"bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700",
		iconBgClass:
			"border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950",
	},
}

function getRoleConfig(role: string | null | undefined) {
	const key = (role ?? "user").toLowerCase()
	return (
		ROLE_CONFIG[key] ?? {
			label: role ?? "User",
			description: "Standard account access.",
			icon: User,
			badgeClass:
				"bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700",
			iconBgClass:
				"border-slate-200 bg-slate-50 dark:border-slate-900 dark:bg-slate-950",
		}
	)
}

export function UserRoleCard({
	userRole,
	userEmail,
	userName,
}: UserRoleCardProps) {
	const config = getRoleConfig(userRole)
	const Icon = config.icon

	return (
		<Card className="overflow-hidden transition-all py-0 gap-0">
			<CardContent className="flex items-center justify-between gap-4 p-6">
				<div className="flex items-center gap-4">
					<div
						className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${config.iconBgClass}`}
					>
						<Icon
							className={`h-7 w-7 ${
								userRole === "admin"
									? "text-purple-600 dark:text-purple-400"
									: "text-blue-600 dark:text-blue-400"
							}`}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center gap-2 flex-wrap">
							<h2 className="text-xl font-semibold">
								{userName || "Anonymous User"}
							</h2>
							<Badge
								variant="outline"
								className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${config.badgeClass}`}
							>
								<Shield className="h-3 w-3" />
								{config.label}
							</Badge>
						</div>
						<p className="text-sm text-muted-foreground">{userEmail}</p>
						<p className="text-xs text-muted-foreground/80">
							{config.description}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
