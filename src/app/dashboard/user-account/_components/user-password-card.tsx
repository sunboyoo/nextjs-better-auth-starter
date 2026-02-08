"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { authClient } from "@/lib/auth-client"
import { setPasswordAction } from "../_actions/set-password"
import { ChevronDown, Loader2, CheckCircle2, XCircle, KeyRound, Info } from "lucide-react"

interface UserPasswordCardProps {
    hasPassword: boolean
}

export function UserPasswordCard({
    hasPassword,
}: UserPasswordCardProps) {
    const router = useRouter()
    const [isExpanded, setIsExpanded] = useState(false)
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [revokeOtherSessions, setRevokeOtherSessions] = useState(false)
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [message, setMessage] = useState("")

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (newPassword !== confirmPassword) {
            setMessage("New passwords do not match.")
            setStatus("error")
            return
        }

        if (newPassword.length < 8) {
            setMessage("New password must be at least 8 characters.")
            setStatus("error")
            return
        }

        setStatus("loading")
        setMessage("Changing password...")

        try {
            const { error } = await authClient.changePassword({
                currentPassword,
                newPassword,
                revokeOtherSessions,
            })

            if (error) {
                throw new Error(error.message)
            }

            setStatus("success")
            setMessage("Password changed successfully!")
            resetForm()
            setTimeout(() => {
                router.refresh()
                setStatus("idle")
                setMessage("")
                setIsExpanded(false)
            }, 2000)
        } catch (error: unknown) {
            setStatus("error")
            setMessage(error instanceof Error ? error.message : "Failed to change password")
        }
    }

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (newPassword !== confirmPassword) {
            setMessage("Passwords do not match.")
            setStatus("error")
            return
        }

        if (newPassword.length < 8) {
            setMessage("Password must be at least 8 characters.")
            setStatus("error")
            return
        }

        setStatus("loading")
        setMessage("Setting password...")

        try {
            const result = await setPasswordAction(newPassword)

            if (!result.success) {
                throw new Error(result.error || "Failed to set password")
            }

            setStatus("success")
            setMessage("Password set successfully! You can now sign in with your email and password.")
            resetForm()
            setTimeout(() => {
                router.refresh()
                setStatus("idle")
                setMessage("")
                setIsExpanded(false)
            }, 3000)
        } catch (error: unknown) {
            setStatus("error")
            setMessage(error instanceof Error ? error.message : "Failed to set password")
        }
    }

    const resetForm = () => {
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setRevokeOtherSessions(false)
        setStatus("idle")
        setMessage("")
    }

    const hasValidInput = hasPassword
        ? currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword
        : newPassword.length >= 8 && newPassword === confirmPassword

    return (
        <Card className="overflow-hidden transition-all py-0 gap-0 border-0 shadow-none">
            {/* Main Card Content - Clickable */}
            <CardContent
                className="group flex cursor-pointer items-center justify-between gap-4 p-6"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                        <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold">Password</h2>
                            <Badge variant={hasPassword ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                                {hasPassword ? "Enabled" : "Not Enabled"}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {hasPassword
                                ? "Change your account password"
                                : "Set a password for email login"}
                        </p>
                    </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:text-primary ${isExpanded ? "rotate-180" : ""}`} />
            </CardContent>

            {/* Expanded Edit Section */}
            {isExpanded && (
                <div className="border-t p-6 rounded-b-xl" style={{ backgroundColor: '#fcfcfc' }}>
                    <form onSubmit={hasPassword ? handleChangePassword : handleSetPassword} className="space-y-4">
                        <div className="grid gap-4">
                            {/* Info for OAuth-only users */}
                            {!hasPassword && (
                                <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                                    <div className="flex gap-3">
                                        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-800 dark:text-blue-200">
                                            <p>You signed up using a social provider. Set a password to enable email/password login.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Current Password Field (only for users with password) */}
                            {hasPassword && (
                                <div className="space-y-2">
                                    <Label htmlFor="current-password">Current Password</Label>
                                    <Input
                                        id="current-password"
                                        type="password"
                                        placeholder="Enter current password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        disabled={status === "loading"}
                                        autoComplete="current-password"
                                    />
                                </div>
                            )}

                            {/* New Password Field */}
                            <div className="space-y-2">
                                <Label htmlFor="new-password">{hasPassword ? "New Password" : "Password"}</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    placeholder={hasPassword ? "Enter new password" : "Enter password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={status === "loading"}
                                    autoComplete="new-password"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Minimum 8 characters
                                </p>
                            </div>

                            {/* Confirm Password Field */}
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm {hasPassword ? "New " : ""}Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    placeholder={hasPassword ? "Confirm new password" : "Confirm password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={status === "loading"}
                                    autoComplete="new-password"
                                />
                            </div>

                            {/* Revoke Other Sessions Option (only for password change) */}
                            {hasPassword && (
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="revoke-sessions"
                                        checked={revokeOtherSessions}
                                        onCheckedChange={(checked) => setRevokeOtherSessions(checked === true)}
                                        disabled={status === "loading"}
                                    />
                                    <Label
                                        htmlFor="revoke-sessions"
                                        className="text-sm font-normal cursor-pointer"
                                    >
                                        Sign out of all other devices
                                    </Label>
                                </div>
                            )}
                        </div>

                        {/* Status Message */}
                        {message && (
                            <div
                                className={`flex items-start gap-2 rounded-md p-3 text-sm ${status === "loading"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                    : status === "success"
                                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                        : status === "error"
                                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                            : ""
                                    }`}
                            >
                                {status === "loading" && <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5" />}
                                {status === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
                                {status === "error" && <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                                <span>{message}</span>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetForm}
                                disabled={status === "loading"}
                            >
                                Reset
                            </Button>
                            <Button
                                type="submit"
                                disabled={status === "loading" || !hasValidInput}
                            >
                                {status === "loading" ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {hasPassword ? "Changing..." : "Setting..."}
                                    </>
                                ) : (
                                    hasPassword ? "Change Password" : "Set Password"
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </Card>
    )
}
