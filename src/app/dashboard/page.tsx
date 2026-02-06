import { AppSidebar } from "./_components/dashboard/app-sidebar"
import { SiteHeader } from "./_components/dashboard/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import ActiveOrganizationCard from "./_components/dashboard-home/active-organization-card"
import UserInvitationsCard from "./_components/dashboard-home/user-invitations-card"
import EmailChangeCard from "./_components/dashboard-home/email-change-card"

export default function DashboardPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <ActiveOrganizationCard />
              <UserInvitationsCard />
              <EmailChangeCard />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
