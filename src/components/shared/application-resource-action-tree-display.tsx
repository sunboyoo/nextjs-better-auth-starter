"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Action {
    id: string;
    key: string;
    name: string;
    resourceId: string;
    resourceKey: string;
    resourceName: string;
}

interface ApplicationResourceActionTreeDisplayProps {
    applicationName: string;
    actionStrings: string[]; // Strings like "application:resource:action"
    availableActions: Action[]; // Metadata to lookup names
}

export function ApplicationResourceActionTreeDisplay({
    applicationName,
    actionStrings,
    availableActions,
}: ApplicationResourceActionTreeDisplayProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);

    // Group assigned actions by resource
    const groupedActions = React.useMemo(() => {
        const groups: Record<string, { name: string; actions: { name: string; key: string }[] }> = {};

        actionStrings.forEach(actionStr => {
            const parts = actionStr.split(':');
            const resourceKey = parts.length >= 3 ? parts[1] : parts[0]; // Logic matches previous fix
            const actionKey = parts.length >= 3 ? parts[2] : parts.length === 2 ? parts[1] : parts[0]; // best guess

            // Find metadata
            // We match by resourceKey -> key. 
            // Note: actionStr might not perfectly match availableActions if format differs, 
            // but we'll try to find an action where action.resourceKey === resourceKey && action.key === actionKey

            const meta = availableActions.find(a => a.resourceKey === resourceKey && a.key === actionKey);

            const resourceName = meta?.resourceName || resourceKey;
            const actionName = meta?.name || actionKey;

            if (!groups[resourceKey]) {
                groups[resourceKey] = {
                    name: resourceName,
                    actions: []
                };
            }
            groups[resourceKey].actions.push({ name: actionName, key: actionKey });
        });

        // Sort resources and actions
        const sortedGroups = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
        sortedGroups.forEach(g => g.actions.sort((a, b) => a.name.localeCompare(b.name)));

        return sortedGroups;
    }, [actionStrings, availableActions]);

    if (groupedActions.length === 0) {
        return <span className="text-muted-foreground text-xs text-center">-</span>;
    }

    return (
        <div className="text-xs">
            {/* Application Header / Toggle */}
            <div
                className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors w-fit"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="font-semibold text-foreground/80">{applicationName}</span>
                <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px] text-muted-foreground">
                    {actionStrings.length}
                </span>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="mt-1 ml-1 pl-2 border-l border-muted space-y-2">
                    {groupedActions.map((group, i) => (
                        <div key={i}>
                            {/* Resource Name */}
                            <div className="font-medium text-muted-foreground/90 mb-0.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 inline-block mb-[1px]" />
                                {group.name}
                            </div>

                            {/* Action Names */}
                            <div className="ml-3 space-y-0.5">
                                {group.actions.map((act, j) => (
                                    <div key={j} className="text-muted-foreground flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                        {act.name}
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
