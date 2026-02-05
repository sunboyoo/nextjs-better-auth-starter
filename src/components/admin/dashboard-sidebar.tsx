"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Settings, LogOut, GalleryVerticalEnd, Building2, Box, UserCog, UserPlus, Key, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { SessionRevokeOtherDialog } from "./session-revoke-other-dialog";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const sidebarNavItems = [
  {
    href: "/admin/users",
    icon: Users,
    label: "Users",
  },
  {
    href: "/admin/user-roles",
    icon: ShieldCheck,
    label: "User Roles",
  },
  {
    href: "/admin/sessions",
    icon: Key,
    label: "Sessions",
  },
  {
    href: "/admin/organizations",
    icon: Building2,
    label: "Organizations",
  },
  {
    href: "/admin/apps",
    icon: Box,
    label: "Apps",
  },
  {
    href: "/admin/organization-app-roles",
    icon: UserCog,
    label: "Org App Roles",
  },
  {
    href: "/admin/assign-roles-to-members",
    icon: UserPlus,
    label: "Assign Roles",
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = authClient;
  const [isRevokeOtherDialogOpen, setIsRevokeOtherDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Admin Panel</span>
                  <span className="">v1.0.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className="text-muted-foreground"
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <Link href="/admin/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out from other devices"
              className="cursor-pointer"
              onClick={() => setIsRevokeOtherDialogOpen(true)}
            >
              <MonitorSmartphone className="h-4 w-4" />
              <span>Sign Out Other Devices</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Logout"
              className="cursor-pointer"
            >
              <button onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SessionRevokeOtherDialog
        isOpen={isRevokeOtherDialogOpen}
        onClose={() => setIsRevokeOtherDialogOpen(false)}
      />
    </Sidebar>
  );
}
