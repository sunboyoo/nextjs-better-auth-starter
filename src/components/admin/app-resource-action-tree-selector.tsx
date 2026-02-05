"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface Action {
    id: string;
    key: string;
    name: string;
    resourceId: string;
    resourceKey: string;
    resourceName: string;
}

interface AppResourceActionTreeSelectorProps {
    appName: string;
    actions: Action[];
    selectedActionIds: string[];
    onSelectionChange: (ids: string[]) => void;
}

export function AppResourceActionTreeSelector({
    appName,
    actions,
    selectedActionIds,
    onSelectionChange,
}: AppResourceActionTreeSelectorProps) {
    const [expandedResources, setExpandedResources] = React.useState<Record<string, boolean>>({});
    const [isAppExpanded, setIsAppExpanded] = React.useState(true);

    // Group actions by resource
    const resources = React.useMemo(() => {
        const groups: Record<string, { key: string; name: string; actions: Action[] }> = {};
        actions.forEach((action) => {
            const key = action.resourceKey;
            if (!groups[key]) {
                groups[key] = {
                    key,
                    name: action.resourceName || action.resourceKey,
                    actions: [],
                };
            }
            groups[key].actions.push(action);
        });
        return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
    }, [actions]);

    // Helper to check selection status
    const getSelectionStatus = (itemIds: string[]) => {
        if (itemIds.length === 0) return "unchecked";
        const selectedCount = itemIds.filter((id) => selectedActionIds.includes(id)).length;
        if (selectedCount === 0) return "unchecked";
        if (selectedCount === itemIds.length) return "checked";
        return "indeterminate";
    };

    // Toggle logic
    const toggleApp = (checked: boolean) => {
        if (checked) {
            // Select all
            const allIds = actions.map((a) => a.id);
            onSelectionChange(allIds);
        } else {
            // Deselect all
            onSelectionChange([]);
        }
    };

    const toggleResource = (resourceActions: Action[], checked: boolean) => {
        const resourceActionIds = resourceActions.map((a) => a.id);
        let newSelected = [...selectedActionIds];

        if (checked) {
            // Add all missing IDs from this resource
            resourceActionIds.forEach((id) => {
                if (!newSelected.includes(id)) {
                    newSelected.push(id);
                }
            });
        } else {
            // Remove all IDs from this resource
            newSelected = newSelected.filter((id) => !resourceActionIds.includes(id));
        }
        onSelectionChange(newSelected);
    };

    const toggleAction = (actionId: string, checked: boolean) => {
        let newSelected = [...selectedActionIds];
        if (checked) {
            newSelected.push(actionId);
        } else {
            newSelected = newSelected.filter((id) => id !== actionId);
        }
        onSelectionChange(newSelected);
    };

    const toggleExpandResource = (resourceKey: string) => {
        setExpandedResources((prev) => ({
            ...prev,
            [resourceKey]: !prev[resourceKey],
        }));
    };

    const appStatus = getSelectionStatus(actions.map((a) => a.id));

    if (actions.length === 0) {
        return <div className="text-sm text-muted-foreground p-4 text-center">No actions available.</div>;
    }

    return (
        <div className="border rounded-md overflow-hidden">
            {/* App Level (Root) */}
            <div className="bg-muted/30 p-2 flex items-center gap-2 border-b">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 hover:bg-transparent"
                    onClick={() => setIsAppExpanded(!isAppExpanded)}
                >
                    {isAppExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                </Button>
                <Checkbox
                    id="tree-app-root"
                    checked={appStatus === "checked" ? true : appStatus === "indeterminate" ? "indeterminate" : false}
                    onCheckedChange={(checked) => toggleApp(checked === true)}
                />
                <label
                    htmlFor="tree-app-root"
                    className="font-semibold text-sm cursor-pointer select-none"
                >
                    {appName}
                </label>
                <span className="text-xs text-muted-foreground ml-auto">
                    {selectedActionIds.length}/{actions.length} selected
                </span>
            </div>

            {/* Resources Level */}
            {isAppExpanded && (
                <div className="bg-card">
                    {resources.map((resource) => {
                        const resourceActionIds = resource.actions.map((a) => a.id);
                        const resourceStatus = getSelectionStatus(resourceActionIds);
                        const isExpanded = expandedResources[resource.key] !== false; // Default to expanded? Or closed? Let's default open or let state decide. Default undefined = closed? Let's default closed. No, existing code says undefined.
                        // Actually, let's default to expanded for better visibility, or collapsed for cleanliness?
                        // User requirement: "tree shape". Usually starts collapsed or expanded. Let's start expandedResources empty -> closed.
                        // But wait, if everything is closed, user sees nothing. Let's defaulted to expanded?
                        // I'll leave it as controlled. Maybe default expand all?
                        // Let's invoke explicit expand toggle.

                        return (
                            <div key={resource.key} className="border-b last:border-0">
                                <div className="flex items-center gap-2 p-2 pl-6 hover:bg-muted/10 transition-colors">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 p-0 hover:bg-transparent"
                                        onClick={() => toggleExpandResource(resource.key)}
                                    >
                                        {expandedResources[resource.key] ? (
                                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                        )}
                                    </Button>
                                    <Checkbox
                                        id={`tree-resource-${resource.key}`}
                                        checked={
                                            resourceStatus === "checked"
                                                ? true
                                                : resourceStatus === "indeterminate"
                                                    ? "indeterminate"
                                                    : false
                                        }
                                        onCheckedChange={(checked) =>
                                            toggleResource(resource.actions, checked === true)
                                        }
                                    />
                                    <label
                                        htmlFor={`tree-resource-${resource.key}`}
                                        className="text-sm font-medium cursor-pointer select-none flex-1"
                                    >
                                        {resource.name}
                                    </label>
                                    <span className="text-xs text-muted-foreground">
                                        {resourceActionIds.filter((id) => selectedActionIds.includes(id)).length}/
                                        {resource.actions.length}
                                    </span>
                                </div>

                                {/* Actions Level */}
                                {expandedResources[resource.key] && (
                                    <div className="bg-muted/10 pl-14 py-1 pr-2 space-y-1">
                                        {resource.actions.map((action) => (
                                            <div
                                                key={action.id}
                                                className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/20"
                                            >
                                                <Checkbox
                                                    id={`tree-action-${action.id}`}
                                                    checked={selectedActionIds.includes(action.id)}
                                                    onCheckedChange={(checked) =>
                                                        toggleAction(action.id, checked === true)
                                                    }
                                                />
                                                <label
                                                    htmlFor={`tree-action-${action.id}`}
                                                    className="text-sm cursor-pointer select-none flex-1 grid gap-0.5"
                                                >
                                                    <span className="font-medium text-foreground">
                                                        {action.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {action.key}
                                                    </span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
