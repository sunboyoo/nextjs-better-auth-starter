"use client"

import * as React from "react"
import Link from "next/link"
import {
    IconDashboard,
    IconSettings,
    IconShield,
    IconUsers,
    IconHelp,
    IconInnerShadowTop,
} from "@tabler/icons-react"

import { NavMain } from "@/components/dashboard-01/nav-main"
import { NavSecondary } from "@/components/dashboard-01/nav-secondary"
import { NavUser } from "@/components/dashboard-01/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
    navMain: [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: IconDashboard,
        },
        {
            title: "Admin Panel",
            url: "/admin",
            icon: IconShield,
        },
        {
            title: "Organizations",
            url: "/admin/organization",
            icon: IconUsers,
        },
    ],
    navSecondary: [
        {
            title: "Settings",
            url: "/dashboard/settings",
            icon: IconSettings,
        },
        {
            title: "Help",
            url: "#",
            icon: IconHelp,
        },
    ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <Link href="/">
                                <IconInnerShadowTop className="!size-5" />
                                <span className="text-base font-semibold">Better Auth</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    )
}
