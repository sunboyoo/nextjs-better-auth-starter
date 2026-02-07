import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import OrganizationCard from "./_components/organization-card";
import SubscriptionCard from "./_components/subscription-card";
import UserCard from "./_components/user-card";

export default async function Page() {
	const requestHeaders = await headers();

	const session = await auth.api.getSession({
		headers: requestHeaders,
	});
	if (!session) {
		redirect("/auth/sign-in");
	}

	const activeSessions = await auth.api.listSessions({
		headers: requestHeaders,
	});

	return (
		<div className="w-full">
			<div className="flex gap-4 flex-col">
				<UserCard session={session} activeSessions={activeSessions} />
				<OrganizationCard session={session} />
				<SubscriptionCard />
			</div>
		</div>
	);
}
