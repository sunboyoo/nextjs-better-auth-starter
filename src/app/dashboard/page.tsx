import ActiveOrganizationCard from "./_components/dashboard-home/active-organization-card"
import UserInvitationsCard from "./_components/dashboard-home/user-invitations-card"
import EmailChangeCard from "./_components/dashboard-home/email-change-card"

export default function DashboardPage() {
  return (
    <>
      <ActiveOrganizationCard />
      <UserInvitationsCard />
      <EmailChangeCard />
    </>
  )
}
