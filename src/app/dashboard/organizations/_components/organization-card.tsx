"use client";

import { Building2, Users, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface OrganizationCardProps {
    organization: {
        id: string;
        name: string;
        slug: string;
        logo?: string | null;
        createdAt: Date;
        members?: { id: string }[];
    };
}

export function OrganizationCard({ organization }: OrganizationCardProps) {
    const router = useRouter();

    const memberCount = organization.members?.length ?? 0;
    const initials = organization.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <Card
            className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30"
            onClick={() => router.push(`/dashboard/organizations/${organization.id}/members`)}
        >
            <CardContent className="p-5">
                <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 rounded-lg">
                        {organization.logo && (
                            <AvatarImage src={organization.logo} alt={organization.name} />
                        )}
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                {organization.name}
                            </h3>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {organization.slug}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                            <Badge variant="secondary" className="text-xs font-normal gap-1">
                                <Users className="h-3 w-3" />
                                {memberCount} {memberCount === 1 ? "member" : "members"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
