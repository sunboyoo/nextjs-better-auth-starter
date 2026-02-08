"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    Link2,
    Unlink,
    Loader2,
    Clock,
    Share2,
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { authClient } from "@/lib/auth-client"
import {
    GithubIcon,
    GoogleIcon,
    FacebookIcon,
    DiscordIcon,
    MicrosoftIcon,
    TwitchIcon,
    TwitterIcon,
    PayPalIcon,
    VercelIcon,
} from "@/components/ui/icons"

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type LinkedAccount = {
    id: string
    providerId: string
    accountId: string
    createdAt: Date
}

type ProviderConfig = {
    name: string
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    iconBgClass: string
    iconTextClass: string
}

/* ------------------------------------------------------------------ */
/*  Provider metadata (icon + branding)                               */
/* ------------------------------------------------------------------ */

const PROVIDER_CONFIG: Record<string, ProviderConfig> = {
    github: {
        name: "GitHub",
        icon: GithubIcon,
        iconBgClass: "bg-gray-100 dark:bg-gray-800",
        iconTextClass: "text-gray-900 dark:text-gray-100",
    },
    google: {
        name: "Google",
        icon: GoogleIcon,
        iconBgClass: "bg-white dark:bg-gray-800",
        iconTextClass: "", // GoogleIcon uses its own brand colors
    },
    facebook: {
        name: "Facebook",
        icon: FacebookIcon,
        iconBgClass: "bg-blue-50 dark:bg-blue-950/30",
        iconTextClass: "text-[#1877F2]",
    },
    discord: {
        name: "Discord",
        icon: DiscordIcon,
        iconBgClass: "bg-indigo-50 dark:bg-indigo-950/30",
        iconTextClass: "text-[#5865F2]",
    },
    microsoft: {
        name: "Microsoft",
        icon: MicrosoftIcon,
        iconBgClass: "bg-white dark:bg-gray-800",
        iconTextClass: "", // MicrosoftIcon uses its own brand colors
    },
    twitch: {
        name: "Twitch",
        icon: TwitchIcon,
        iconBgClass: "bg-purple-50 dark:bg-purple-950/30",
        iconTextClass: "text-[#9146FF]",
    },
    twitter: {
        name: "X (Twitter)",
        icon: TwitterIcon,
        iconBgClass: "bg-gray-100 dark:bg-gray-800",
        iconTextClass: "text-gray-900 dark:text-gray-100",
    },
    paypal: {
        name: "PayPal",
        icon: PayPalIcon,
        iconBgClass: "bg-blue-50 dark:bg-blue-950/30",
        iconTextClass: "text-[#003087]",
    },
    vercel: {
        name: "Vercel",
        icon: VercelIcon,
        iconBgClass: "bg-gray-100 dark:bg-gray-800",
        iconTextClass: "text-gray-900 dark:text-gray-100",
    },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatDate(date: Date | string) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(date))
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface UserOAuthCardProps {
    /** Provider IDs configured on the server (e.g. "github", "google") */
    availableProviders: string[]
    /** Accounts the current user has already linked */
    linkedAccounts: LinkedAccount[]
    /** Total number of accounts the user has (including credential) */
    accountCount: number
}

export function UserOAuthCard({
    availableProviders,
    linkedAccounts,
    accountCount,
}: UserOAuthCardProps) {
    const router = useRouter()

    /* ---- local state ---- */
    const [localLinkedAccounts, setLocalLinkedAccounts] = useState(linkedAccounts)
    const [localAccountCount, setLocalAccountCount] = useState(accountCount)
    const [linkingProvider, setLinkingProvider] = useState<string | null>(null)
    const [unlinkTarget, setUnlinkTarget] = useState<{
        providerId: string
        name: string
    } | null>(null)
    const [isUnlinking, setIsUnlinking] = useState(false)

    /* ---- derived ---- */
    const connectedCount = localLinkedAccounts.length
    const canUnlink = localAccountCount > 1

    const getLinkedAccount = (providerId: string) =>
        localLinkedAccounts.find((a) => a.providerId === providerId)

    /* ---- sorted: connected first, then unconnected ---- */
    const sortedProviders = [...availableProviders].sort((a, b) => {
        const aLinked = getLinkedAccount(a) ? 0 : 1
        const bLinked = getLinkedAccount(b) ? 0 : 1
        return aLinked - bLinked
    })

    /* ---------------------------------------------------------------- */
    /*  Handlers (Better Auth client APIs – policy-compliant)           */
    /* ---------------------------------------------------------------- */

    const handleLinkProvider = async (providerId: string) => {
        setLinkingProvider(providerId)
        try {
            // authClient.linkSocial triggers an OAuth redirect.
            // The user will return to callbackURL after the flow completes.
            await authClient.linkSocial({
                provider: providerId as "github",
                callbackURL: "/dashboard/user-account",
            })
        } catch {
            toast.error("Failed to start the connection flow. Please try again.")
            setLinkingProvider(null)
        }
    }

    const handleUnlinkProvider = async () => {
        if (!unlinkTarget) return

        setIsUnlinking(true)
        try {
            const { error } = await authClient.unlinkAccount({
                providerId: unlinkTarget.providerId,
            })

            if (error) {
                toast.error(
                    error.message || `Failed to disconnect ${unlinkTarget.name}`,
                )
            } else {
                toast.success(`${unlinkTarget.name} account disconnected`)
                setLocalLinkedAccounts((prev) =>
                    prev.filter((a) => a.providerId !== unlinkTarget.providerId),
                )
                setLocalAccountCount((prev) => prev - 1)
                router.refresh()
            }
        } catch {
            toast.error("Failed to disconnect account. Please try again.")
        } finally {
            setIsUnlinking(false)
            setUnlinkTarget(null)
        }
    }

    /* ---------------------------------------------------------------- */
    /*  Render                                                          */
    /* ---------------------------------------------------------------- */

    return (
        <>
            <Card className="py-0 gap-0 overflow-hidden border-0 shadow-none">
                <CardContent className="p-0">
                    {/* ---------- Header ---------- */}
                    <div className="flex items-center justify-between border-b px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                <Share2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold">Social Accounts</h3>
                                <p className="text-xs text-muted-foreground">
                                    Connect social providers for quick sign-in
                                </p>
                            </div>
                        </div>
                        <Badge
                            variant={connectedCount > 0 ? "default" : "secondary"}
                            className="text-[10px] px-1.5 py-0"
                        >
                            {connectedCount} of {availableProviders.length} connected
                        </Badge>
                    </div>

                    {/* ---------- Provider list ---------- */}
                    {sortedProviders.length > 0 ? (
                        <div className="divide-y">
                            {sortedProviders.map((providerId) => {
                                const config = PROVIDER_CONFIG[providerId]
                                if (!config) return null

                                const linked = getLinkedAccount(providerId)
                                const isLinking = linkingProvider === providerId
                                const Icon = config.icon

                                return (
                                    <div
                                        key={providerId}
                                        className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted/20 bg-[#fcfcfc]"
                                    >
                                        {/* Provider info */}
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.iconBgClass} ${config.iconTextClass}`}
                                            >
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium">
                                                        {config.name}
                                                    </p>
                                                    {linked && (
                                                        <Badge
                                                            variant="default"
                                                            className="h-4 bg-green-600 px-1.5 py-0 text-[10px]"
                                                        >
                                                            Connected
                                                        </Badge>
                                                    )}
                                                </div>
                                                {linked ? (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        Connected{" "}
                                                        {formatDate(linked.createdAt)}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground">
                                                        Not connected
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action */}
                                        {linked ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() =>
                                                    setUnlinkTarget({
                                                        providerId,
                                                        name: config.name,
                                                    })
                                                }
                                                disabled={!canUnlink}
                                                title={
                                                    !canUnlink
                                                        ? "Cannot disconnect your only sign-in method"
                                                        : undefined
                                                }
                                            >
                                                <Unlink className="mr-1.5 h-4 w-4" />
                                                <span className="hidden sm:inline">
                                                    Disconnect
                                                </span>
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleLinkProvider(providerId)
                                                }
                                                disabled={linkingProvider !== null}
                                            >
                                                {isLinking ? (
                                                    <>
                                                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                                        Connecting…
                                                    </>
                                                ) : (
                                                    <>
                                                        <Link2 className="mr-1.5 h-4 w-4" />
                                                        Connect
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground/50">
                                <Share2 className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">
                                    No social providers available
                                </p>
                                <p className="text-xs text-muted-foreground/70">
                                    Social sign-in providers have not been configured
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ---------- Unlink Confirmation ---------- */}
            <AlertDialog
                open={!!unlinkTarget}
                onOpenChange={(open) => !open && setUnlinkTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Disconnect {unlinkTarget?.name}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to disconnect your{" "}
                            {unlinkTarget?.name} account? You will no longer be
                            able to sign in with this provider unless you
                            reconnect it later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isUnlinking}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleUnlinkProvider}
                            disabled={isUnlinking}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            {isUnlinking ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Disconnecting…
                                </>
                            ) : (
                                "Disconnect"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
