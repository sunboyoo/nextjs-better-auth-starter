import type { CSSProperties, ReactNode } from "react";
import { ApplicationSidebar } from "./_components/dashboard/application-sidebar";
import { ImpersonationBanner } from "./_components/dashboard/impersonation-banner";
import { SiteHeader } from "./_components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import type { DeviceSession } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const dashboardSessionApi = auth.api as unknown as {
	listDeviceSessions: (input: { headers: Headers }) => Promise<DeviceSession[]>;
};

export default async function DashboardLayout({
	children,
}: {
	children: ReactNode;
}) {
	const requestHeaders = await headers();
	const session = await auth.api.getSession({
		headers: requestHeaders,
	});

	if (!session) {
		redirect("/auth/sign-in?callbackUrl=/dashboard");
	}

	const deviceSessions = await dashboardSessionApi.listDeviceSessions({
		headers: requestHeaders,
	});
	const sessionData = session.session as
		| { impersonatedBy?: string | null }
		| undefined;
	const isImpersonated = Boolean(sessionData?.impersonatedBy);

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as CSSProperties
			}
		>
			<ApplicationSidebar
				variant="inset"
				deviceSessions={deviceSessions}
			/>
			<SidebarInset className="overflow-hidden bg-[#f5f5f8] dark:bg-muted/40">
				<SiteHeader />
				<div className="flex flex-1 flex-col">
					<div className="@container/main flex flex-1 flex-col gap-2">
						<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
							{isImpersonated ? <ImpersonationBanner /> : null}
							{children}
						</div>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
