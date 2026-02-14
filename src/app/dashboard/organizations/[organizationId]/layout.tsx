"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Users, Mail, Layers, Shield, AppWindow, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const tabs = [
    { label: "Members", href: "members", icon: Users },
    { label: "Invitations", href: "invitations", icon: Mail },
    { label: "Teams", href: "teams", icon: Layers },
    { label: "Roles", href: "organization-roles", icon: Shield },
    { label: "Applications", href: "applications", icon: AppWindow },
];

export default function OrganizationDetailLayout({ children }: { children: ReactNode }) {
    const params = useParams<{ organizationId: string }>();
    const pathname = usePathname();
    const organizationId = params.organizationId;

    // Set this organization as active when entering
    useEffect(() => {
        if (organizationId) {
            authClient.organization.setActive({ organizationId });
        }
    }, [organizationId]);

    const { data: activeOrg, isPending } = authClient.useActiveOrganization();

    const currentTab = tabs.find((tab) =>
        pathname.endsWith(`/${tab.href}`) || pathname.includes(`/${tab.href}/`)
    );

    const initials = activeOrg?.name
        ?.split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) ?? "..";

    return (
        <div className="w-full space-y-6">
            {/* Back Link */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link
                    href="/dashboard/organizations"
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Organizations
                </Link>
            </div>

            {/* Organization Header */}
            <div className="rounded-xl border-0 shadow-none bg-card p-6 md:p-8">
                {isPending ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Loading organization...</span>
                    </div>
                ) : activeOrg ? (
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 rounded-lg">
                            {activeOrg.logo && (
                                <AvatarImage src={activeOrg.logo} alt={activeOrg.name} />
                            )}
                            <AvatarFallback className="rounded-lg bg-violet-100 text-violet-600 font-semibold dark:bg-violet-900/30 dark:text-violet-400">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-base font-bold tracking-tight md:text-lg">
                                {activeOrg.name}
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {activeOrg.slug}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">Organization not found</p>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="border-b">
                <nav className="flex gap-1 overflow-x-auto pb-px -mb-px" aria-label="Organization tabs">
                    {tabs.map((tab) => {
                        const isActive = currentTab?.href === tab.href;
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.href}
                                href={`/dashboard/organizations/${organizationId}/${tab.href}`}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                                    isActive
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            {children}
        </div>
    );
}
