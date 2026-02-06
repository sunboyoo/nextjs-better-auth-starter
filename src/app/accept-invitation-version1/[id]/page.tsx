"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Mail, Building2, User, AlertTriangle, Loader2, LogIn } from "lucide-react";

// Type that matches Better Auth's getInvitation response
interface InvitationData {
    id: string;
    email: string;
    role: string | null;
    status: string;
    expiresAt: Date;
    organizationId: string;
    inviterId: string;
    // Nested objects from Better Auth
    organizationName?: string;
    organizationSlug?: string;
    organizationLogo?: string | null;
    inviterName?: string | null;
    inviterEmail?: string;
    inviterImage?: string | null;
    // Alternative nested structure
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

// Helper to safely extract organization info
function getOrganizationInfo(data: InvitationData) {
    return {
        id: data.organization?.id || data.organizationId,
        name: data.organization?.name || data.organizationName || "Organization",
        slug: data.organization?.slug || data.organizationSlug || "",
        logo: data.organization?.logo || data.organizationLogo || null,
    };
}

// Helper to safely extract inviter info
function getInviterInfo(data: InvitationData) {
    const inviterUser = data.inviter?.user;
    return {
        id: data.inviter?.id || data.inviterId,
        name: inviterUser?.name || data.inviter?.name || data.inviterName || null,
        email: inviterUser?.email || data.inviter?.email || data.inviterEmail || "",
        image: inviterUser?.image || data.inviter?.image || data.inviterImage || null,
    };
}

export default function AcceptInvitationPage() {
    const params = useParams();
    const router = useRouter();
    const invitationId = params.id as string;

    const [invitation, setInvitation] = useState<InvitationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAccepting, setIsAccepting] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [actionResult, setActionResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Check auth status
    const { data: session, isPending: isSessionLoading } = authClient.useSession();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isSessionLoading && !session) {
            const callbackUrl = encodeURIComponent(`/accept-invitation/${invitationId}`);
            router.push(`/auth/login?callbackUrl=${callbackUrl}`);
        }
    }, [session, isSessionLoading, router, invitationId]);

    // Fetch invitation only when user is authenticated
    useEffect(() => {
        const fetchInvitation = async () => {
            if (!session) return;

            try {
                // Use Better Auth client-side getInvitation
                const { data, error: fetchError } = await authClient.organization.getInvitation({
                    query: { id: invitationId },
                });

                if (fetchError) {
                    throw new Error(fetchError.message || "Failed to fetch invitation");
                }

                if (data) {
                    console.log("Invitation data:", data); // Debug log
                    setInvitation(data as unknown as InvitationData);
                } else {
                    throw new Error("Invitation not found");
                }
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError("Failed to load invitation");
                }
            } finally {
                setIsLoading(false);
            }
        };

        if (session && invitationId) {
            fetchInvitation();
        }
    }, [session, invitationId]);

    const handleAccept = async () => {
        setIsAccepting(true);
        setActionResult(null);

        try {
            const { error } = await authClient.organization.acceptInvitation({
                invitationId,
            });

            if (error) {
                throw new Error(error.message || "Failed to accept invitation");
            }

            setActionResult({ type: "success", message: "Invitation accepted! You are now a member of the organization." });
            // Redirect to dashboard after a short delay
            setTimeout(() => router.push("/dashboard"), 2000);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setActionResult({ type: "error", message: err.message });
            } else {
                setActionResult({ type: "error", message: "Failed to accept invitation" });
            }
        } finally {
            setIsAccepting(false);
        }
    };

    const handleReject = async () => {
        setIsRejecting(true);
        setActionResult(null);

        try {
            const { error } = await authClient.organization.rejectInvitation({
                invitationId,
            });

            if (error) {
                throw new Error(error.message || "Failed to reject invitation");
            }

            setActionResult({ type: "success", message: "Invitation rejected." });
            setTimeout(() => router.push("/"), 2000);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setActionResult({ type: "error", message: err.message });
            } else {
                setActionResult({ type: "error", message: "Failed to reject invitation" });
            }
        } finally {
            setIsRejecting(false);
        }
    };

    // Show loading while checking session
    if (isSessionLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
                        <Skeleton className="h-6 w-48 mx-auto mb-2" />
                        <Skeleton className="h-4 w-64 mx-auto" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                    <CardFooter className="flex gap-3">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 flex-1" />
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Redirect message while navigating to login
    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <LogIn className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle>Sign In Required</CardTitle>
                        <CardDescription>
                            Please sign in to view and respond to this invitation.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <Button onClick={() => {
                            const callbackUrl = encodeURIComponent(`/accept-invitation/${invitationId}`);
                            router.push(`/auth/login?callbackUrl=${callbackUrl}`);
                        }}>
                            <LogIn className="h-4 w-4 mr-2" />
                            Sign In
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Show loading while fetching invitation
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
                        <Skeleton className="h-6 w-48 mx-auto mb-2" />
                        <Skeleton className="h-4 w-64 mx-auto" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                    </CardContent>
                    <CardFooter className="flex gap-3">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 flex-1" />
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-destructive" />
                        </div>
                        <CardTitle>Invitation Not Found</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <Button variant="outline" onClick={() => router.push("/")}>
                            Go Home
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (!invitation) {
        return null;
    }

    // Extract data using helper functions
    const org = getOrganizationInfo(invitation);
    const inviter = getInviterInfo(invitation);

    const isExpired = new Date(invitation.expiresAt) < new Date();
    const isPending = invitation.status === "pending";
    const canTakeAction = isPending && !isExpired;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4">
                        {org.logo ? (
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={org.logo} alt={org.name} />
                                <AvatarFallback className="text-xl">
                                    {org.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        ) : (
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-8 w-8 text-primary" />
                            </div>
                        )}
                    </div>
                    <CardTitle className="text-xl">Organization Invitation</CardTitle>
                    <CardDescription>
                        You&apos;ve been invited to join <span className="font-semibold text-foreground">{org.name}</span>
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Invitation Details */}
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{invitation.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Role: <Badge variant="secondary" className="ml-1 capitalize">{invitation.role || "member"}</Badge></span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={inviter.image || undefined} />
                                    <AvatarFallback className="text-[10px]">
                                        {(inviter.name || "?").substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-muted-foreground">
                                    Invited by {inviter.name || inviter.email}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Status Messages */}
                    {isExpired && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                            <AlertTriangle className="h-4 w-4" />
                            <span>This invitation has expired.</span>
                        </div>
                    )}

                    {!isPending && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg p-3">
                            <span>This invitation has already been {invitation.status}.</span>
                        </div>
                    )}

                    {actionResult && (
                        <div className={`flex items-center gap-2 text-sm rounded-lg p-3 ${actionResult.type === "success"
                            ? "text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/30"
                            : "text-destructive bg-destructive/10"
                            }`}>
                            {actionResult.type === "success" ? (
                                <CheckCircle className="h-4 w-4" />
                            ) : (
                                <AlertTriangle className="h-4 w-4" />
                            )}
                            <span>{actionResult.message}</span>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex gap-3 pt-2">
                    {canTakeAction ? (
                        <>
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleReject}
                                disabled={isRejecting || isAccepting || !!actionResult}
                            >
                                {isRejecting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <XCircle className="h-4 w-4 mr-2" />
                                )}
                                Reject
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleAccept}
                                disabled={isAccepting || isRejecting || !!actionResult}
                            >
                                {isAccepting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Accept
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
                            Go Home
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
