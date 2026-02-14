"use client";

import { Shield, Crown, User } from "lucide-react";
import { BUILT_IN_ORGANIZATION_ROLES } from "@/lib/built-in-organization-role-permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const roleIcons: Record<string, React.ElementType> = {
    owner: Crown,
    admin: Shield,
    member: User,
};

const roleColors: Record<string, string> = {
    owner: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    member: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function OrganizationRolesPage() {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Organization Roles</h2>
            </div>
            <p className="text-xs text-muted-foreground">
                These are the built-in roles for this organization. Role permissions are managed by the system administrator.
            </p>

            {/* Roles Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {BUILT_IN_ORGANIZATION_ROLES.map((role) => {
                    const Icon = roleIcons[role.role] ?? User;
                    const colorClass = roleColors[role.role] ?? roleColors.member;

                    return (
                        <Card key={role.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass} shrink-0`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm capitalize">{role.role}</CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            {role.description}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">Permissions</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {Object.entries(role.permissions).map(([resource, actions]) => (
                                            <div key={resource} className="space-y-1">
                                                {(actions as string[]).map((action) => (
                                                    <Badge
                                                        key={`${resource}-${action}`}
                                                        variant="outline"
                                                        className="text-[10px] font-mono"
                                                    >
                                                        {resource}:{action}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t">
                                    <Badge variant="secondary" className="text-[10px]">Built-in</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
