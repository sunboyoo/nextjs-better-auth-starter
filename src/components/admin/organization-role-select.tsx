"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// 默认角色（Better Auth 内置）
const DEFAULT_ROLES = [
    { id: "owner", name: "Owner" },
    { id: "admin", name: "Admin" },
    { id: "member", name: "Member" },
];

interface DynamicRole {
    id: string;
    role: string;
}

export interface RoleOption {
    id: string;
    name: string;
}

interface RoleSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    dynamicRoles?: DynamicRole[];
    disabled?: boolean;
    isLoading?: boolean;
    placeholder?: string;
    showAllOption?: boolean;
    allOptionLabel?: string;
    className?: string;
    triggerClassName?: string;
}

export function OrganizationRoleSelect({
    value,
    onValueChange,
    dynamicRoles = [],
    disabled = false,
    isLoading = false,
    placeholder = "Select role",
    showAllOption = false,
    allOptionLabel = "All roles",
    className,
    triggerClassName = "h-9",
}: RoleSelectProps) {
    // 合并默认角色和动态角色
    const allRoles: RoleOption[] = [
        ...DEFAULT_ROLES,
        ...dynamicRoles.map((r) => ({ id: r.id, name: r.role })),
    ];

    const isBuiltIn = (roleId: string) => ["owner", "admin", "member"].includes(roleId);

    return (
        <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
            <SelectTrigger className={triggerClassName}>
                {isLoading ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading roles...
                    </span>
                ) : (
                    <SelectValue placeholder={placeholder} />
                )}
            </SelectTrigger>
            <SelectContent className={className}>
                {showAllOption && (
                    <SelectItem value="all">{allOptionLabel}</SelectItem>
                )}
                {allRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                        <div className="flex items-center gap-1.5">
                            <span>{r.name}</span>
                            {isBuiltIn(r.id) ? (
                                <span className="text-[10px] leading-tight bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1 py-px rounded">
                                    Built-in
                                </span>
                            ) : (
                                <span className="text-[10px] leading-tight bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-1 py-px rounded">
                                    Custom
                                </span>
                            )}
                            {r.id === "member" && (
                                <span className="text-[10px] leading-tight bg-muted px-1 py-px rounded text-muted-foreground">
                                    Default
                                </span>
                            )}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
