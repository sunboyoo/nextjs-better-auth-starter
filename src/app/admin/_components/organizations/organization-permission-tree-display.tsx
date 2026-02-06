"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface OrganizationPermissionTreeDisplayProps {
    permissions: Record<string, string[]>;
}

export function OrganizationPermissionTreeDisplay({ permissions }: OrganizationPermissionTreeDisplayProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);

    const resourceKeys = Object.keys(permissions).sort();
    const totalActions = Object.values(permissions).reduce((acc, actions) => acc + actions.length, 0);

    if (totalActions === 0) {
        return <span className="text-muted-foreground text-xs text-center italic">No permissions</span>;
    }

    return (
        <div className="text-xs">
            {/* Header / Toggle */}
            <div
                className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors w-fit"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="font-semibold text-foreground/80">Permissions</span>
                <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px] text-muted-foreground">
                    {totalActions}
                </span>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="mt-1 ml-1 pl-2 border-l border-muted space-y-2">
                    {resourceKeys.map((resource) => (
                        <div key={resource}>
                            {/* Resource Name */}
                            <div className="font-medium text-muted-foreground/90 mb-0.5 flex items-center gap-1 capitalize">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 inline-block mb-[1px]" />
                                {resource}
                            </div>

                            {/* Actions */}
                            <div className="ml-3 space-y-0.5">
                                {permissions[resource].map((action) => (
                                    <div key={action} className="text-muted-foreground flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                        {action}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
