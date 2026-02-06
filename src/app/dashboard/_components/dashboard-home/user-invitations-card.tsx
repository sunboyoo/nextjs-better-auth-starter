"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Building2, Check, X, Loader2, Clock, User } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface Invitation {
    id: string;
    email: string;
    role: string | null;
    status: string;
    expiresAt: Date;
    organizationId: string;
    inviterId: string;
    organizationName?: string;
    organizationSlug?: string;
    organizationLogo?: string | null;
    inviterName?: string | null;
    inviterEmail?: string;
    inviterImage?: string | null;
    organization?: {
        id: string;
        name: string;
        slug?: string;
        logo?: string | null;
    };
    inviter?: {
        id: string;
        name: string | null;
        email: string;
        image?: string | null;
        user?: {
            name: string | null;
            email: string;
            image?: string | null;
        };
    };
}

function getOrganizationInfo(inv: Invitation) {
    return {
        id: inv.organization?.id || inv.organizationId,
        name: inv.organization?.name || inv.organizationName || "Organization",
        slug: inv.organization?.slug || inv.organizationSlug || "",
        logo: inv.organization?.logo || inv.organizationLogo || null,
    };
}

function getInviterInfo(inv: Invitation) {
    const inviterUser = inv.inviter?.user;
    return {
        id: inv.inviter?.id || inv.inviterId,
        name: inviterUser?.name || inv.inviter?.name || inv.inviterName || null,
        email: inviterUser?.email || inv.inviter?.email || inv.inviterEmail || "",
        image: inviterUser?.image || inv.inviter?.image || inv.inviterImage || null,
    };
}

const UserInvitationsCard = () => {
    const router = useRouter();
    const { data: session } = authClient.useSession();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch invitations when session is available
    useEffect(() => {
        const fetchInvitations = async () => {
            if (!session) {
                setIsLoading(false);
                return;
            }

            try {
                const { data, error: fetchError } = await authClient.organization.listUserInvitations();

                console.log("listUserInvitations response:", data); // Debug log

                if (fetchError) {
                    setError("Failed to load invitations");
                    console.error("Failed to fetch invitations:", fetchError);
                } else if (data) {
                    // Filter to only show pending invitations
                    const pending = (data as Invitation[]).filter(inv => inv.status === "pending");
                    console.log("Pending invitations:", pending); // Debug log
                    setInvitations(pending);
                }
            } catch (err) {
                console.error("Error fetching invitations:", err);
                setError("Failed to load invitations");
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvitations();
    }, [session]);

    const handleAccept = async (invitationId: string) => {
        setProcessingId(invitationId);
        try {
            const { error } = await authClient.organization.acceptInvitation({
                invitationId,
            });

            if (error) {
                alert(error.message || "Failed to accept invitation");
            } else {
                // Remove from list and refresh
                setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
                router.refresh();
            }
        } catch (err) {
            console.error("Error accepting invitation:", err);
            alert("Failed to accept invitation");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (invitationId: string) => {
        setProcessingId(invitationId);
        try {
            const { error } = await authClient.organization.rejectInvitation({
                invitationId,
            });

            if (error) {
                alert(error.message || "Failed to reject invitation");
            } else {
                setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
            }
        } catch (err) {
            console.error("Error rejecting invitation:", err);
            alert("Failed to reject invitation");
        } finally {
            setProcessingId(null);
        }
    };

    // Don't render if not logged in
    if (!session) {
        return null;
    }

    // Loading state
    if (isLoading) {
        return (
            <Card className="mb-12">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5" />
                        <Skeleton className="h-5 w-40" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card className="mb-12">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Organization Invitations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Failed to load invitations.</p>
                </CardContent>
            </Card>
        );
    }

    // No pending invitations - show empty state
    if (invitations.length === 0) {
        return (
            <Card className="mb-12">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Organization Invitations
                    </CardTitle>
                    <CardDescription>
                        Organization invitations will appear here
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="mb-4 rounded-full bg-muted p-4">
                            <Mail className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            You don&apos;t have any pending invitations
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mb-12">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Organization Invitations
                    <Badge variant="secondary" className="ml-2">
                        {invitations.length}
                    </Badge>
                </CardTitle>
                <CardDescription>
                    You have been invited to join the following organizations
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {invitations.map((invitation) => {
                        const org = getOrganizationInfo(invitation);
                        const inviter = getInviterInfo(invitation);
                        const isProcessing = processingId === invitation.id;

                        return (
                            <div
                                key={invitation.id}
                                className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Organization Logo */}
                                    {org.logo ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={org.logo}
                                            alt={org.name}
                                            className="h-12 w-12 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                            <Building2 className="h-6 w-6 text-primary" />
                                        </span>
                                    )}

                                    <div className="flex flex-col gap-1">
                                        <span className="font-semibold">{org.name}</span>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Badge variant="outline" className="capitalize">
                                                {invitation.role || "member"}
                                            </Badge>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Expires {format(new Date(invitation.expiresAt), "MMM d, yyyy")}
                                            </span>
                                        </div>
                                        {(inviter.name || inviter.email) && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Avatar className="h-4 w-4">
                                                    <AvatarImage src={inviter.image || undefined} />
                                                    <AvatarFallback>
                                                        <User className="h-2 w-2" />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span>Invited by {inviter.name || inviter.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleReject(invitation.id)}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <X className="h-4 w-4 mr-1" />
                                                Decline
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleAccept(invitation.id)}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4 mr-1" />
                                                Accept
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default UserInvitationsCard;
