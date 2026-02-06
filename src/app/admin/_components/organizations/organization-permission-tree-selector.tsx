"use client";

import * as React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface OrganizationPermissionTreeSelectorProps {
    availablePermissions: Record<string, readonly string[]>;
    selectedPermissions: Record<string, string[]>;
    onChange: (permissions: Record<string, string[]>) => void;
    resourceLabels?: Record<string, string>;
    className?: string;
}

export function OrganizationPermissionTreeSelector({
    availablePermissions,
    selectedPermissions,
    onChange,
    resourceLabels = {},
    className,
}: OrganizationPermissionTreeSelectorProps) {
    // Track expanded state for each resource
    const [expandedResources, setExpandedResources] = React.useState<Set<string>>(new Set());

    // Sort resources alphabetically
    const sortedResources = Object.keys(availablePermissions).sort();

    // Toggle resource expansion
    const toggleResource = (resource: string) => {
        const newExpanded = new Set(expandedResources);
        if (newExpanded.has(resource)) {
            newExpanded.delete(resource);
        } else {
            newExpanded.add(resource);
        }
        setExpandedResources(newExpanded);
    };

    // Expand all resources initially
    React.useEffect(() => {
        setExpandedResources(new Set(Object.keys(availablePermissions)));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleActionToggle = (resource: string, action: string) => {
        const currentActions = selectedPermissions[resource] || []; // Ensure strictly string[]
        const isSelected = currentActions.includes(action);

        let newActions: string[];
        if (isSelected) {
            newActions = currentActions.filter(a => a !== action);
        } else {
            newActions = [...currentActions, action];
        }

        const newPermissions = {
            ...selectedPermissions,
            [resource]: newActions
        };

        // Clean up empty arrays if preferred, but keeping empty key is fine too
        if (newActions.length === 0) {
            delete newPermissions[resource];
        }

        onChange(newPermissions);
    };

    const handleResourceToggle = (resource: string, checked: boolean) => {
        const actions = availablePermissions[resource];
        const newPermissions = { ...selectedPermissions };

        if (checked) {
            // Select all
            newPermissions[resource] = [...actions];
        } else {
            // Deselect all
            delete newPermissions[resource];
        }
        onChange(newPermissions);
    };

    return (
        <div className={cn("border rounded-lg overflow-hidden", className)}>
            <div className="bg-muted px-4 py-2 text-sm font-medium border-b flex items-center justify-between">
                <span>Permissions</span>
                <Badge variant="secondary" className="text-xs">
                    {Object.values(selectedPermissions).flat().length} Selected
                </Badge>
            </div>

            <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                {sortedResources.map((resource) => {
                    const actions = availablePermissions[resource];
                    const selectedActions = selectedPermissions[resource] || [];
                    const isExpanded = expandedResources.has(resource);
                    const isAllSelected = actions.every(a => selectedActions.includes(a));
                    const isSomeSelected = selectedActions.length > 0 && selectedActions.length < actions.length;

                    return (
                        <div key={resource} className="border rounded-md overflow-hidden bg-card">
                            {/* Resource Header */}
                            <div className="flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors">
                                <button
                                    type="button"
                                    onClick={() => toggleResource(resource)}
                                    className="p-1 hover:bg-muted rounded text-muted-foreground"
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    )}
                                </button>

                                <Checkbox
                                    id={`resource-${resource}`}
                                    checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                                    onCheckedChange={(checked) => handleResourceToggle(resource, checked === true)}
                                />

                                <label
                                    htmlFor={`resource-${resource}`}
                                    className="flex-1 font-medium text-sm cursor-pointer select-none capitalize"
                                >
                                    {resourceLabels[resource] || resource}
                                </label>

                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {selectedActions.length}/{actions.length}
                                </span>
                            </div>

                            {/* Actions List */}
                            {isExpanded && (
                                <div className="pl-9 pr-2 pb-2 pt-0 space-y-1">
                                    {actions.map((action) => {
                                        const isSelected = selectedActions.includes(action);
                                        return (
                                            <div
                                                key={action}
                                                className="flex items-center gap-2 py-1"
                                            >
                                                <span className="w-4 h-px bg-border -ml-4" /> {/* Visual connector */}
                                                <Checkbox
                                                    id={`action-${resource}-${action}`}
                                                    checked={isSelected}
                                                    onCheckedChange={() => handleActionToggle(resource, action)}
                                                />
                                                <label
                                                    htmlFor={`action-${resource}-${action}`}
                                                    className="text-sm cursor-pointer select-none text-muted-foreground peer-data-[state=checked]:text-foreground"
                                                >
                                                    {action}
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
