import ActiveOrganizationCard from "./_components/dashboard-home/active-organization-card"
import UserInvitationsCard from "./_components/dashboard-home/user-invitations-card"

export default function DashboardPage() {
  return (
    <>
      <ActiveOrganizationCard />
      <UserInvitationsCard />
    </>
  )
}
