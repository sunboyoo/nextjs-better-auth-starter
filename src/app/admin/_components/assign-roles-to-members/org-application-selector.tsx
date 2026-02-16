"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "@/data/query-keys/admin";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SELECTOR_PAGE_LIMIT } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

interface Organization {
    id: string;
    name: string;
    slug: string;
}

interface App {
    id: string;
    key: string;
    name: string;
    isActive: boolean;
}

interface OrgAppSelectorProps {
    selectedOrgId: string;
    onOrgChange: (orgId: string) => void;
    selectedAppId: string;
    onAppChange: (appId: string) => void;
}

export function OrgAppSelector({
    selectedOrgId,
    onOrgChange,
    selectedAppId,
    onAppChange,
}: OrgAppSelectorProps) {
    const [openOrg, setOpenOrg] = useState(false);
    const [openApp, setOpenApp] = useState(false);

    // Fetch organizations
    const organizationsUrl = `/api/admin/organizations?limit=${SELECTOR_PAGE_LIMIT}`;
    const { data: orgsData } = useQuery({
        queryKey: adminKeys.organizations(organizationsUrl),
        queryFn: () => fetcher(organizationsUrl),
    });
    const organizations: Organization[] = orgsData?.organizations || [];

    // Fetch apps
    const appsUrl = `/api/admin/apps?limit=${SELECTOR_PAGE_LIMIT}`;
    const { data: appsData } = useQuery({
        queryKey: adminKeys.apps(appsUrl),
        queryFn: () => fetcher(appsUrl),
    });
    const allApps: App[] = appsData?.apps || [];

    return (
        <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Organization</Label>
                <Popover open={openOrg} onOpenChange={setOpenOrg}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openOrg}
                            className="w-[350px] justify-between"
                        >
                            {selectedOrgId
                                ? organizations.find((org) => org.id === selectedOrgId)?.name
                                : "Select organization"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0">
                        <Command>
                            <CommandInput placeholder="Search organization..." />
                            <CommandList>
                                <CommandEmpty>No organization found.</CommandEmpty>
                                <CommandGroup>
                                    {organizations.map((org) => (
                                        <CommandItem
                                            key={org.id}
                                            value={org.name}
                                            onSelect={() => {
                                                onOrgChange(org.id);
                                                setOpenOrg(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedOrgId === org.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {org.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">App</Label>
                <Popover open={openApp} onOpenChange={setOpenApp}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openApp}
                            className="w-[300px] justify-between"
                            disabled={!selectedOrgId}
                        >
                            {selectedAppId
                                ? allApps.find((app) => app.id === selectedAppId)?.name
                                : "Select app"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput placeholder="Search app..." />
                            <CommandList>
                                <CommandEmpty>No app found.</CommandEmpty>
                                <CommandGroup>
                                    {allApps.map((app) => (
                                        <CommandItem
                                            key={app.id}
                                            value={app.name}
                                            onSelect={() => {
                                                onAppChange(app.id);
                                                setOpenApp(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedAppId === app.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {app.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
