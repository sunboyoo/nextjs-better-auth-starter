"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Users, Mail, Shield } from "lucide-react";

import { cn } from "@/lib/utils";

interface OrganizationDetailTabsProps {
    organizationId: string;
}

const TABS = [
    { value: "profile", label: "Profile", icon: User },
    { value: "members", label: "Members", icon: Users },
    { value: "invitations", label: "Invitations", icon: Mail },
    { value: "roles", label: "Roles", icon: Shield },
] as const;

export function OrganizationDetailTabs({ organizationId }: OrganizationDetailTabsProps) {
    const pathname = usePathname();

    // Determine active tab from pathname
    const activeTab = TABS.find(tab =>
        pathname.endsWith(`/${tab.value}`)
    )?.value ?? "profile";

    return (
        <div className="w-full border-b">
            <nav className="flex gap-1" aria-label="Tabs">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.value;
                    const href = `/admin/organizations/${organizationId}/${tab.value}`;

                    return (
                        <Link
                            key={tab.value}
                            href={href}
                            className={cn(
                                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                                "hover:text-foreground",
                                isActive
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                            {isActive && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                            )}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
