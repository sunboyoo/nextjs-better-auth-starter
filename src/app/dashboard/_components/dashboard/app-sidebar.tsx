"use client"

import * as React from "react"
import Link from "next/link"
import {
    IconDashboard,
    IconSettings,
    IconShield,
    IconUsers,
    IconHelp,
    IconUser,
} from "@tabler/icons-react"

import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { DeviceSession } from "@/lib/auth"

const staticNavSecondary = [
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
]

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
    deviceSessions: DeviceSession[]
}

export function AppSidebar({
    deviceSessions,
    ...props
}: AppSidebarProps) {
    const navMain = [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: IconDashboard,
        },
        {
            title: "My Profile",
            url: "/dashboard/user-profile",
            icon: IconUser,
        },
        {
            title: "User Account",
            url: "/dashboard/user-account",
            icon: IconUser,
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
    ]

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <Link href="/" className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
                                    <span className="text-primary-foreground font-bold text-xs">ID</span>
                                </div>
                                <span className="text-base font-semibold">Next.js Better Auth Starter</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navMain} />
                <NavSecondary items={staticNavSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <NavUser deviceSessions={deviceSessions} />
            </SidebarFooter>
        </Sidebar>
    )
}
