"use client";

import { Building2, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { OrganizationCard } from "./_components/organization-card";
import { CreateOrganizationDialog } from "./_components/create-organization-dialog";

export default function OrganizationsPage() {
    const { data: organizations, isPending, error, refetch } = authClient.useListOrganizations();

    return (
        <div className="w-full space-y-6">
            {/* Page Header */}
            <div className="rounded-xl border-0 shadow-none bg-card p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600 shadow-sm dark:bg-violet-900/30 dark:text-violet-400">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold tracking-tight md:text-lg">
                                Organizations
                            </h1>
                            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                                Manage your organizations and collaborate with your teams.
                            </p>
                        </div>
                    </div>
                    <CreateOrganizationDialog onSuccess={() => refetch()} />
                </div>
            </div>

            {/* Content */}
            {isPending ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="rounded-xl border bg-card p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        Failed to load organizations. Please try again.
                    </p>
                </div>
            ) : !organizations || organizations.length === 0 ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <Building2 className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">No organizations yet</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Create your first organization to get started.
                            </p>
                        </div>
                        <div className="mt-2">
                            <CreateOrganizationDialog onSuccess={() => refetch()} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {organizations.map((organization) => (
                        <OrganizationCard key={organization.id} organization={organization} />
                    ))}
                </div>
            )}
        </div>
    );
}
