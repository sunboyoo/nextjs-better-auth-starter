"use client"

import { useState } from "react"
import { CaptchaActionSlot } from "@/components/captcha/captcha-action-slot"
import { useCaptchaAction } from "@/components/captcha/use-captcha-action"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import {
    CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE,
    getCaptchaHeaders,
} from "@/lib/captcha"
import { ChevronDown, Loader2, AlertTriangle, Trash2, CheckCircle2, Mail } from "lucide-react"

interface DeleteUserCardProps {
    hasPassword: boolean
    userEmail: string
}

type CaptchaAction = "delete-user"

export function DeleteUserCard({
    hasPassword,
    userEmail,
}: DeleteUserCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [password, setPassword] = useState("")
    const [confirmText, setConfirmText] = useState("")
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [message, setMessage] = useState("")
    const {
        captchaRef,
        runCaptchaForActionOrFail,
        resetCaptcha,
        isCaptchaVisibleFor,
    } = useCaptchaAction<CaptchaAction>()

    const confirmPhrase = "DELETE"

    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault()

        if (confirmText !== confirmPhrase) {
            setMessage(`Please type "${confirmPhrase}" to confirm deletion.`)
            setStatus("error")
            return
        }

        if (hasPassword && !password) {
            setMessage("Please enter your password to confirm deletion.")
            setStatus("error")
            return
        }

        setStatus("loading")
        setMessage("Processing deletion request...")

        try {
            const captchaToken = await runCaptchaForActionOrFail("delete-user", () => {
                setStatus("error")
                setMessage(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE)
            })
            if (captchaToken === undefined) return

            if (hasPassword) {
                const { error } = await authClient.deleteUser({
                    password,
                    callbackURL: "/auth/sign-in?deleted=true",
                    fetchOptions: {
                        headers: getCaptchaHeaders(captchaToken),
                    },
                })

                if (error) {
                    throw new Error(error.message)
                }
            } else {
                // OAuth user without password, use fresh session
                const { error } = await authClient.deleteUser({
                    callbackURL: "/auth/sign-in?deleted=true",
                    fetchOptions: {
                        headers: getCaptchaHeaders(captchaToken),
                    },
                })

                if (error) {
                    throw new Error(error.message)
                }
            }

            // If we get here, either:
            // 1. A verification email was sent (if sendDeleteAccountVerification is configured)
            // 2. The account was deleted immediately
            setStatus("success")
            setMessage("A confirmation email has been sent to your email address. Please click the link in the email to complete the account deletion.")
            setPassword("")
            setConfirmText("")
        } catch (error: unknown) {
            setStatus("error")
            setMessage(error instanceof Error ? error.message : "Failed to delete account")
        } finally {
            resetCaptcha()
        }
    }

    const resetForm = () => {
        setPassword("")
        setConfirmText("")
        setStatus("idle")
        setMessage("")
    }

    const isConfirmValid = confirmText === confirmPhrase
    const isPasswordValid = !hasPassword || password.length > 0
    const canSubmit = isConfirmValid && isPasswordValid && status !== "loading" && status !== "success"

    return (
        <Card className="overflow-hidden transition-all py-0 gap-0 border-0 shadow-none">
            {/* Main Card Content - Clickable */}
            <CardContent
                className="group flex cursor-pointer items-center justify-between gap-4 p-6"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                        <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Delete Account</h2>
                        <p className="text-xs text-muted-foreground">
                            Permanently delete your account and all data
                        </p>
                    </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:text-red-600 dark:group-hover:text-red-400 ${isExpanded ? "rotate-180" : ""}`} />
            </CardContent>

            {/* Expanded Delete Section */}
            {isExpanded && (
                <div className="border-t border-red-200 p-6 rounded-b-xl bg-red-50/50 dark:border-red-900 dark:bg-red-950/30">
                    <form onSubmit={handleDeleteAccount} className="space-y-4">
                        <div className="grid gap-4">
                            {/* Warning Message */}
                            <div className="rounded-md border border-red-300 bg-red-100 p-4 dark:border-red-800 dark:bg-red-900/50">
                                <div className="flex gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                    <div className="text-sm text-red-800 dark:text-red-200">
                                        <p className="font-semibold mb-2">Warning: This action cannot be undone!</p>
                                        <ul className="list-disc list-inside space-y-1 text-xs">
                                            <li>Your account <strong>{userEmail}</strong> will be permanently deleted</li>
                                            <li>All your data, sessions, and linked accounts will be removed</li>
                                            <li>A confirmation email will be sent to verify this action</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Password Confirmation (for users with password) */}
                            {hasPassword && (
                                <div className="space-y-2">
                                    <Label htmlFor="delete-password">Confirm Password</Label>
                                    <Input
                                        id="delete-password"
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={status === "loading" || status === "success"}
                                        autoComplete="current-password"
                                    />
                                </div>
                            )}

                            {/* Type Confirmation */}
                            <div className="space-y-2">
                                <Label htmlFor="confirm-delete">
                                    Type <span className="font-mono font-bold text-red-600">{confirmPhrase}</span> to confirm
                                </Label>
                                <Input
                                    id="confirm-delete"
                                    type="text"
                                    placeholder={`Type "${confirmPhrase}" here`}
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                                    disabled={status === "loading" || status === "success"}
                                    className="font-mono"
                                />
                            </div>
                        </div>

                        {/* Status Messages */}
                        {message && status === "error" && (
                            <div className="flex items-start gap-2 rounded-md p-3 text-sm bg-red-500/10 text-red-600 dark:text-red-400">
                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{message}</span>
                            </div>
                        )}

                        {message && status === "success" && (
                            <div className="flex items-start gap-2 rounded-md p-3 text-sm bg-green-500/10 text-green-600 dark:text-green-400">
                                <Mail className="h-4 w-4 shrink-0 mt-0.5" />
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
                                {status === "success" ? "Close" : "Cancel"}
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={!canSubmit}
                            >
                                {status === "loading" ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : status === "success" ? (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Email Sent
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Request Account Deletion
                                    </>
                                )}
                            </Button>
                        </div>
                        <CaptchaActionSlot
                            show={isCaptchaVisibleFor("delete-user")}
                            captchaRef={captchaRef}
                        />
                    </form>
                </div>
            )}
        </Card>
    )
}
