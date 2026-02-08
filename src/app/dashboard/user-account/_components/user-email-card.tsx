"use client"

import { useState } from "react"
import { CaptchaActionSlot } from "@/components/captcha/captcha-action-slot"
import { useCaptchaAction } from "@/components/captcha/use-captcha-action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import {
    CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE,
    getCaptchaHeaders,
} from "@/lib/captcha"
import { ChevronDown, Loader2, CheckCircle2, XCircle, Mail, ShieldCheck, ShieldX, Info } from "lucide-react"

interface UserEmailCardProps {
    userEmail: string
    emailVerified: boolean
    emailSource?: string | null
    emailDeliverable?: boolean | null
    primaryAuthChannel?: string | null
}

type CaptchaAction = "change-email" | "resend-verification-email"

export function UserEmailCard({
    userEmail,
    emailVerified,
    emailSource,
    emailDeliverable,
    primaryAuthChannel,
}: UserEmailCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [email, setEmail] = useState("")
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [message, setMessage] = useState("")
    const {
        captchaRef,
        runCaptchaForActionOrFail,
        resetCaptcha,
        isCaptchaVisibleFor,
    } = useCaptchaAction<CaptchaAction>()
    const isSyntheticEmail = emailSource === "synthetic" || emailDeliverable === false
    const supportsEmailChannel = !isSyntheticEmail
    const channelLabel =
        primaryAuthChannel === "mixed"
            ? "Primary: mixed (email + phone)"
            : primaryAuthChannel === "phone"
                ? "Primary: phone"
                : "Primary: email"

    const handleChangeEmail = async (e: React.FormEvent) => {
        e.preventDefault()

        const normalizedEmail = email.trim().toLowerCase()
        const currentEmail = userEmail.trim().toLowerCase()

        if (normalizedEmail === currentEmail) {
            setMessage("New email must be different from your current email.")
            setStatus("error")
            return
        }

        if (!normalizedEmail) {
            setMessage("Please enter a new email address.")
            setStatus("error")
            return
        }

        setStatus("loading")
        setMessage("Sending verification request...")

        try {
            const captchaToken = await runCaptchaForActionOrFail("change-email", () => {
                setStatus("error")
                setMessage(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE)
            })
            if (captchaToken === undefined) return

            const { error } = await authClient.changeEmail({
                newEmail: normalizedEmail,
                callbackURL: "/dashboard/user-account",
                fetchOptions: {
                    headers: getCaptchaHeaders(captchaToken),
                },
            })

            if (error) {
                throw new Error(error.message)
            }

            setStatus("success")
            if (emailVerified) {
                setMessage("Step 1: A confirmation email has been sent to your current email address. Please click the link to confirm this change, then a verification email will be sent to your new address.")
            } else {
                setMessage("A verification email has been sent to your new email address. Please click the link to verify and complete the change.")
            }
            setEmail("")
        } catch (error: unknown) {
            setStatus("error")
            setMessage(error instanceof Error ? error.message : "Failed to change email")
        } finally {
            resetCaptcha()
        }
    }

    const handleResendVerification = async () => {
        if (!supportsEmailChannel) {
            setStatus("error")
            setMessage(
                "This is a phone-first placeholder email. Add a real email first to enable email verification.",
            )
            return
        }

        const captchaToken = await runCaptchaForActionOrFail("resend-verification-email", () => {
            setStatus("error")
            setMessage(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE)
        })
        if (captchaToken === undefined) return

        setStatus("loading")
        setMessage("Sending verification email...")

        try {
            const { error } = await authClient.sendVerificationEmail(
                {
                    email: userEmail,
                },
                {
                    headers: getCaptchaHeaders(captchaToken),
                },
            )

            if (error) {
                throw new Error(error.message)
            }

            setStatus("success")
            setMessage("Verification email sent! Please check your inbox.")
            setTimeout(() => {
                setStatus("idle")
                setMessage("")
            }, 5000)
        } catch (error: unknown) {
            setStatus("error")
            setMessage(error instanceof Error ? error.message : "Failed to send verification email")
        } finally {
            resetCaptcha()
        }
    }

    const resetForm = () => {
        setEmail("")
        setStatus("idle")
        setMessage("")
        resetCaptcha()
    }

    const hasChanges = email.trim().length > 0 && email.trim().toLowerCase() !== userEmail.toLowerCase()

    return (
        <Card className="overflow-hidden transition-all py-0 gap-0 border-0 shadow-none">
            {/* Main Card Content - Clickable */}
            <CardContent
                className="group flex cursor-pointer items-center justify-between gap-4 p-6"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <Mail className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm font-semibold">{userEmail}</h2>
                            {isSyntheticEmail && (
                                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-medium">
                                    Synthetic
                                </Badge>
                            )}
                            {emailVerified ? (
                                <Badge variant="default" className="gap-1 bg-green-600 px-1.5 py-0 text-[10px] font-medium">
                                    <ShieldCheck className="h-3 w-3" />
                                    Verified
                                </Badge>
                            ) : (
                                <Badge variant="destructive" className="gap-1 px-1.5 py-0 text-[10px] font-medium">
                                    <ShieldX className="h-3 w-3" />
                                    Unverified
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {supportsEmailChannel
                                ? "Primary email address"
                                : "Phone-first placeholder email. Add a real email to enable email OTP and magic links."}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">{channelLabel}</p>
                    </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:text-primary ${isExpanded ? "rotate-180" : ""}`} />
            </CardContent>

            {/* Expanded Edit Section */}
            {isExpanded && (
                <div className="border-t p-6 rounded-b-xl" style={{ backgroundColor: '#fcfcfc' }}>
                    <form onSubmit={handleChangeEmail} className="space-y-4">
                        <div className="grid gap-4">
                            {/* Current Email Display */}
                            <div className="space-y-2">
                                <Label>Current Email</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="email"
                                        value={userEmail}
                                        disabled
                                        className="bg-white/50"
                                    />
                                    {emailVerified ? (
                                        <Badge variant="default" className="gap-1 bg-green-600 shrink-0">
                                            <ShieldCheck className="h-3 w-3" />
                                            Verified
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive" className="gap-1 shrink-0">
                                            <ShieldX className="h-3 w-3" />
                                            Unverified
                                        </Badge>
                                    )}
                                    {isSyntheticEmail && (
                                        <Badge variant="secondary" className="shrink-0">
                                            Synthetic
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* New Email Field */}
                            <div className="space-y-2">
                                <Label htmlFor="new-email">New Email Address</Label>
                                <Input
                                    id="new-email"
                                    type="email"
                                    placeholder="Enter new email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={status === "loading"}
                                />
                            </div>

                            {/* Two-step Process Info */}
                            {emailVerified && (
                                <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                                    <div className="flex gap-3">
                                        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-800 dark:text-blue-200">
                                            <p className="font-medium mb-1">Two-step verification process:</p>
                                            <ol className="list-decimal list-inside space-y-1 text-xs">
                                                <li>A confirmation email will be sent to your <strong>current email</strong></li>
                                                <li>After clicking the confirmation link, a verification email will be sent to your <strong>new email</strong></li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Resend Verification Option for Unverified Email */}
                            {!emailVerified && (
                                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                                    <div className="flex gap-3">
                                        <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-amber-800 dark:text-amber-200">
                                            {supportsEmailChannel ? (
                                                <>
                                                    <p>Your current email is not verified.</p>
                                                    <button
                                                        type="button"
                                                        onClick={handleResendVerification}
                                                        className="font-medium underline hover:no-underline mt-1"
                                                        disabled={status === "loading"}
                                                    >
                                                        Resend verification email
                                                    </button>
                                                    <CaptchaActionSlot
                                                        show={isCaptchaVisibleFor("resend-verification-email")}
                                                        captchaRef={captchaRef}
                                                        className="mt-2"
                                                    />
                                                </>
                                            ) : (
                                                <p>
                                                    This placeholder email cannot receive messages. Add a real email
                                                    and verify it to enable email-based sign-in and recovery.
                                                </p>
                                            )}
                                        </div>
                                    </div>
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
                                disabled={status === "loading" || !hasChanges}
                            >
                                {status === "loading" ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    "Change Email"
                                )}
                            </Button>
                        </div>
                        <CaptchaActionSlot
                            show={isCaptchaVisibleFor("change-email")}
                            captchaRef={captchaRef}
                        />
                    </form>
                </div>
            )}
        </Card>
    )
}
