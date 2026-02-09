"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UAParser } from "ua-parser-js"
import { Laptop, Smartphone, Monitor, Loader2, LogOut, XCircle, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRevokeSessionMutation } from "@/data/user/revoke-session-mutation"
import type { Session } from "@/lib/auth"

type SessionData = Session["session"] & {
    impersonatedBy?: string | null
}

interface ActiveSessionCardProps {
    sessions: SessionData[]
    currentSessionId: string
}

function getDeviceInfo(userAgent: string | null | undefined) {
    if (!userAgent) return { type: "unknown", os: "Unknown", browser: "Unknown" }

    const parser = new UAParser(userAgent)
    const device = parser.getDevice()
    const os = parser.getOS()
    const browser = parser.getBrowser()

    return {
        type: device.type || "desktop",
        os: os.name || "Unknown OS",
        browser: browser.name || "Unknown Browser",
    }
}

function getDeviceIcon(type: string) {
    switch (type) {
        case "mobile":
            return Smartphone
        case "tablet":
            return Monitor
        default:
            return Laptop
    }
}

function formatDate(date: Date | string) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(date))
}

function isSessionExpired(expiresAt: Date | string) {
    return new Date(expiresAt) < new Date()
}

export function ActiveSessionCard({ sessions, currentSessionId }: ActiveSessionCardProps) {
    const router = useRouter()
    const revokeSessionMutation = useRevokeSessionMutation()
    const [localSessions, setLocalSessions] = useState(sessions)
    const activeSessions = localSessions.filter(s => !isSessionExpired(s.expiresAt))

    const handleRevokeSession = (session: SessionData) => {
        const isCurrentSession = session.id === currentSessionId

        revokeSessionMutation.mutate(
            { token: session.token },
            {
                onSuccess: () => {
                    setLocalSessions(prev => prev.filter(s => s.id !== session.id))
                    if (isCurrentSession) {
                        router.push("/auth/sign-in")
                    }
                },
            }
        )
    }

    const activeSessionsCount = activeSessions.length

    if (activeSessions.length === 0) {
        return (
            <Card className="py-0 gap-0">
                <CardContent className="p-6">
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <p>No active sessions found</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="py-0 gap-0 overflow-hidden border-0 shadow-none">
            <CardContent className="p-0">
                {/* Header */}
                <div className="flex items-center justify-between border-b-[#f1f1f3] border-b px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                            {activeSessionsCount} Active Session{activeSessionsCount !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                {/* Session List */}
                <div className="divide-y bg-[#fcfcfc]">
                    {activeSessions.map((session) => {
                        const deviceInfo = getDeviceInfo(session.userAgent)
                        const DeviceIcon = getDeviceIcon(deviceInfo.type)
                        const isCurrentSession = session.id === currentSessionId
                        const isRevoking = revokeSessionMutation.isPending &&
                            revokeSessionMutation.variables?.token === session.token

                        return (
                            <div
                                key={session.id}
                                className={`flex items-center justify-between gap-4 px-6 py-4 transition-colors`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Device Icon */}
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isCurrentSession
                                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                                        }`}>
                                        <DeviceIcon className="h-5 w-5" />
                                    </div>

                                    {/* Session Info */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">
                                                {deviceInfo.os} · {deviceInfo.browser}
                                            </span>
                                            {isCurrentSession && (
                                                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-green-600">
                                                    Current
                                                </Badge>
                                            )}
                                            {session.impersonatedBy && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                                    Impersonated
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            {session.ipAddress && (
                                                <span>IP: {session.ipAddress}</span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(session.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <Button
                                    variant={isCurrentSession ? "destructive" : "ghost"}
                                    size="sm"
                                    onClick={() => handleRevokeSession(session)}
                                    disabled={isRevoking}
                                    className="shrink-0"
                                >
                                    {isRevoking ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : isCurrentSession ? (
                                        <>
                                            <LogOut className="mr-1.5 h-4 w-4" />
                                            Sign Out
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="mr-1.5 h-4 w-4" />
                                            Revoke
                                        </>
                                    )}
                                </Button>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
