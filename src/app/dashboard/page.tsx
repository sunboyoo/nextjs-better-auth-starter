import { AppSidebar } from "@/components/dashboard-01/app-sidebar"
import { SiteHeader } from "@/components/dashboard-01/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import ActiveOrganizationCard from "@/components/dashboard/active-organization-card"
import UserInvitationsCard from "@/components/dashboard/user-invitations-card"
import EmailChangeCard from "@/components/dashboard/email-change-card"

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
