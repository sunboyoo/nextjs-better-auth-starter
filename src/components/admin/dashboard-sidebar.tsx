"use client";

import { useState } from "react";
import {
  Users,
  Settings,
  GalleryVerticalEnd,
  Building2,
  Box,
  UserCog,
  UserPlus,
  Key,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";
import { SessionRevokeOtherDialog } from "./session-revoke-other-dialog";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navMainItems = [
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "User Roles",
    url: "/admin/user-roles",
    icon: ShieldCheck,
  },
  {
    title: "Sessions",
    url: "/admin/sessions",
    icon: Key,
  },
  {
    title: "Organizations",
    url: "/admin/organizations",
    icon: Building2,
  },
  {
    title: "Apps",
    url: "/admin/apps",
    icon: Box,
  },
  {
    title: "Org App Roles",
    url: "/admin/organization-app-roles",
    icon: UserCog,
  },
  {
    title: "Assign Roles",
    url: "/admin/assign-roles-to-members",
    icon: UserPlus,
  },
];

// Mock user data - in real app, this would come from session context
const mockUser = {
  name: "Admin User",
  email: "admin@example.com",
  avatar: "",
};

export function DashboardSidebar() {
  const [isRevokeOtherDialogOpen, setIsRevokeOtherDialogOpen] = useState(false);

  const navSecondaryItems = [
    {
      title: "Settings",
      url: "/admin/settings",
      icon: Settings,
    },
    {
      title: "Sign Out Other Devices",
      icon: MonitorSmartphone,
      onClick: () => setIsRevokeOtherDialogOpen(true),
    },
  ];

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Admin Panel</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={mockUser} />
      </SidebarFooter>

      <SessionRevokeOtherDialog
        isOpen={isRevokeOtherDialogOpen}
        onClose={() => setIsRevokeOtherDialogOpen(false)}
      />
    </Sidebar>
  );
}
