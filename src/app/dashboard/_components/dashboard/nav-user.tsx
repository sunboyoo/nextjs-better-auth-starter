"use client"

import { useRouter } from "next/navigation"
import {
    IconPlus,
    IconDotsVertical,
    IconLogout,
    IconUserCircle,
    IconSwitch2,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import type { DeviceSession } from "@/lib/auth"

export function NavUser({
    deviceSessions,
}: {
    deviceSessions: DeviceSession[]
}) {
    const { isMobile } = useSidebar()
    const router = useRouter()
    const { data: session } = authClient.useSession()

    const user = session?.user

    if (!user) {
        return null
    }

    const handleLogout = async () => {
        await authClient.signOut()
        router.push("/auth/sign-in")
    }

    const switchableSessions = deviceSessions.filter((deviceSession) => {
        return deviceSession.user.id !== user.id
    })

    const switchAccount = async (sessionToken: string) => {
        try {
            await authClient.multiSession.setActive({
                sessionToken,
            })
            toast.success("Switched account")
            router.refresh()
        } catch (error) {
            toast.error("Failed to switch account")
        }
    }

    const initials = user.name
        ? user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : user.email?.slice(0, 2).toUpperCase() || "U"

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-full">
                                <AvatarImage src={user.image || ""} alt={user.name || ""} />
                                <AvatarFallback className="rounded-full">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{user.name || "User"}</span>
                                <span className="text-muted-foreground truncate text-xs">
                                    {user.email}
                                </span>
                            </div>
                            <IconDotsVertical className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-full">
                                    <AvatarImage src={user.image || ""} alt={user.name || ""} />
                                    <AvatarFallback className="rounded-full">{initials}</AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{user.name || "User"}</span>
                                    <span className="text-muted-foreground truncate text-xs">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                                <IconUserCircle />
                                Account
                            </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Current Account
                        </DropdownMenuLabel>
                        <DropdownMenuItem disabled>
                            <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-5 w-5 rounded-md">
                                    <AvatarImage src={user.image || ""} alt={user.name || ""} />
                                    <AvatarFallback className="rounded-md text-[10px]">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="truncate text-sm">{user.name || "User"}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Switch Account
                        </DropdownMenuLabel>
                        {switchableSessions.length === 0 ? (
                            <DropdownMenuItem disabled>No other accounts</DropdownMenuItem>
                        ) : (
                            switchableSessions.map((deviceSession) => (
                                <DropdownMenuItem
                                    key={deviceSession.user.id}
                                    onClick={() => switchAccount(deviceSession.session.token)}
                                >
                                    <IconSwitch2 />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm">
                                            {deviceSession.user.name || "User"}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {deviceSession.user.email}
                                        </p>
                                    </div>
                                </DropdownMenuItem>
                            ))
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push("/auth/sign-in")}>
                            <IconPlus />
                            Add Account
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <IconLogout />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
