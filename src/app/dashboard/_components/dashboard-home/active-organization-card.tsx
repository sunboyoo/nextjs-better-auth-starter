"use client";

import { useState } from "react";
import { Building2, Check, ChevronDown, Loader2, AlertCircle, UserPlus, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ActiveOrganizationCard = () => {
    const { data: activeOrganization, isPending: isActiveLoading } =
        authClient.useActiveOrganization();
    const { data: organizations, isPending: isListLoading } =
        authClient.useListOrganizations();
    const [isSwitching, setIsSwitching] = useState(false);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [isInviting, setIsInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);

    const handleSetActive = async (organizationId: string) => {
        if (organizationId === activeOrganization?.id) return;
        setIsSwitching(true);
        try {
            await authClient.organization.setActive({ organizationId });
        } finally {
            setIsSwitching(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim() || !activeOrganization) return;

        setIsInviting(true);
        setInviteError(null);
        setInviteSuccess(false);

        try {
            const { error } = await authClient.organization.inviteMember({
                email: inviteEmail.trim(),
                role: "member",
                organizationId: activeOrganization.id,
            });

            if (error) {
                setInviteError(error.message || "Failed to send invitation");
            } else {
                setInviteSuccess(true);
                setInviteEmail("");
                setTimeout(() => {
                    setIsInviteDialogOpen(false);
                    setInviteSuccess(false);
                }, 1500);
            }
        } catch (err) {
            console.error("Invite error:", err);
            setInviteError("Failed to send invitation");
        } finally {
            setIsInviting(false);
        }
    };

    const handleCloseInviteDialog = () => {
        setIsInviteDialogOpen(false);
        setInviteEmail("");
        setInviteError(null);
        setInviteSuccess(false);
    };

    const isPending = isActiveLoading || isListLoading;

    // Loading state
    if (isPending) {
        return (
            <Card className="mb-12">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    const hasOrganizations = organizations && organizations.length > 0;
    const hasMultipleOrgs = organizations && organizations.length > 1;

    // No active organization - show prominent selection UI
    if (!activeOrganization) {
        return (
            <Card className="mb-12">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Active Organization
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {hasOrganizations ? (
                        <Alert className="border-amber-500/50 bg-amber-500/10">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            <AlertTitle className="text-amber-600 dark:text-amber-400">
                                No Active Organization
                            </AlertTitle>
                            <AlertDescription className="mt-3">
                                <p className="mb-4 text-muted-foreground">
                                    Select an organization to activate your workspace and access its resources.
                                </p>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="default"
                                            size="lg"
                                            className="w-full sm:w-auto"
                                            disabled={isSwitching}
                                        >
                                            {isSwitching ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Activating...
                                                </>
                                            ) : (
                                                <>
                                                    <Building2 className="mr-2 h-4 w-4" />
                                                    Select Organization
                                                    <ChevronDown className="ml-2 h-4 w-4" />
                                                </>
                                            )}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-[240px]">
                                        <DropdownMenuLabel>Your Organizations</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {organizations.map((org) => (
                                            <DropdownMenuItem
                                                key={org.id}
                                                onClick={() => handleSetActive(org.id)}
                                                className="cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {org.logo ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={org.logo}
                                                            alt={org.name}
                                                            className="h-8 w-8 rounded-md object-cover"
                                                        />
                                                    ) : (
                                                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                                                            <Building2 className="h-4 w-4 text-primary" />
                                                        </span>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{org.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {org.slug}
                                                        </span>
                                                    </div>
                                                </div>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="mb-4 rounded-full bg-muted p-4">
                                <Building2 className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold">No Organizations</h3>
                            <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                                You don&apos;t belong to any organizations yet. Create one to get started
                                with team collaboration.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    // Has active organization - show info with switch option
    return (
        <Card className="mb-12">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Active Organization
                </CardTitle>
                <CardDescription>
                    Your currently active organization workspace
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {activeOrganization.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={activeOrganization.logo}
                                alt={`${activeOrganization.name} logo`}
                                width={48}
                                height={48}
                                className="h-12 w-12 rounded-xl object-cover"
                            />
                        ) : (
                            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                <Building2 className="h-6 w-6" />
                            </span>
                        )}
                        <div className="flex flex-col gap-1">
                            <span className="text-lg font-semibold">
                                {activeOrganization.name}
                            </span>
                            <Badge variant="secondary" className="w-fit">
                                {activeOrganization.slug}
                            </Badge>
                        </div>
                    </div>

                    {hasMultipleOrgs && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" disabled={isSwitching}>
                                    {isSwitching ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Switching...
                                        </>
                                    ) : (
                                        <>
                                            Switch
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[240px]">
                                <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {organizations?.map((org) => (
                                    <DropdownMenuItem
                                        key={org.id}
                                        onClick={() => handleSetActive(org.id)}
                                        className="cursor-pointer"
                                        disabled={org.id === activeOrganization.id}
                                    >
                                        <div className="flex w-full items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                {org.logo ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={org.logo}
                                                        alt={org.name}
                                                        className="h-8 w-8 rounded-md object-cover"
                                                    />
                                                ) : (
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                                                        <Building2 className="h-4 w-4 text-primary" />
                                                    </span>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{org.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {org.slug}
                                                    </span>
                                                </div>
                                            </div>
                                            {org.id === activeOrganization.id && (
                                                <Check className="h-4 w-4 text-primary" />
                                            )}
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Invite Member Button */}
                <div className="mt-4 pt-4 border-t">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setIsInviteDialogOpen(true)}
                    >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite Members to Organization
                    </Button>
                </div>
            </CardContent>

            {/* Invite Dialog */}
            <Dialog open={isInviteDialogOpen} onOpenChange={handleCloseInviteDialog}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Invite Members to Organization
                        </DialogTitle>
                        <DialogDescription>
                            Invite someone to join {activeOrganization.name}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInvite}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="inviteEmail">Email address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="inviteEmail"
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="user@example.com"
                                        className="pl-9"
                                        autoFocus
                                        required
                                        disabled={isInviting || inviteSuccess}
                                    />
                                </div>
                            </div>
                            {inviteError && (
                                <p className="text-sm text-destructive">{inviteError}</p>
                            )}
                            {inviteSuccess && (
                                <p className="text-sm text-green-600">Invitation sent successfully!</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCloseInviteDialog}
                                disabled={isInviting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isInviting || !inviteEmail.trim() || inviteSuccess}>
                                {isInviting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : inviteSuccess ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Sent!
                                    </>
                                ) : (
                                    "Send Invitation"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default ActiveOrganizationCard;
