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

interface Application {
    id: string;
    key: string;
    name: string;
    isActive: boolean;
}

interface OrganizationApplicationSelectorProps {
    selectedOrganizationId: string;
    onOrganizationChange: (organizationId: string) => void;
    selectedApplicationId: string;
    onApplicationChange: (applicationId: string) => void;
}

export function OrganizationApplicationSelector({
    selectedOrganizationId,
    onOrganizationChange,
    selectedApplicationId,
    onApplicationChange,
}: OrganizationApplicationSelectorProps) {
    const [openOrg, setOpenOrg] = useState(false);
    const [openApp, setOpenApp] = useState(false);

    // Fetch organizations
    const organizationsUrl = `/api/admin/organizations?limit=${SELECTOR_PAGE_LIMIT}`;
    const { data: orgsData } = useQuery({
        queryKey: adminKeys.organizations(organizationsUrl),
        queryFn: () => fetcher(organizationsUrl),
    });
    const organizations: Organization[] = orgsData?.organizations || [];

    // Fetch applications
    const applicationsUrl = `/api/admin/applications?limit=${SELECTOR_PAGE_LIMIT}`;
    const { data: applicationsData } = useQuery({
        queryKey: adminKeys.applications(applicationsUrl),
        queryFn: () => fetcher(applicationsUrl),
    });
    const allApplications: Application[] = applicationsData?.applications || [];

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
                            {selectedOrganizationId
                                ? organizations.find((organization) => organization.id === selectedOrganizationId)?.name
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
                                    {organizations.map((organization) => (
                                        <CommandItem
                                            key={organization.id}
                                            value={organization.name}
                                            onSelect={() => {
                                                onOrganizationChange(organization.id);
                                                setOpenOrg(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedOrganizationId === organization.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {organization.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Application</Label>
                <Popover open={openApp} onOpenChange={setOpenApp}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openApp}
                            className="w-[300px] justify-between"
                            disabled={!selectedOrganizationId}
                        >
                            {selectedApplicationId
                                ? allApplications.find((application) => application.id === selectedApplicationId)?.name
                                : "Select application"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput placeholder="Search application..." />
                            <CommandList>
                                <CommandEmpty>No application found.</CommandEmpty>
                                <CommandGroup>
                                    {allApplications.map((application) => (
                                        <CommandItem
                                            key={application.id}
                                            value={application.name}
                                            onSelect={() => {
                                                onApplicationChange(application.id);
                                                setOpenApp(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedApplicationId === application.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {application.name}
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
