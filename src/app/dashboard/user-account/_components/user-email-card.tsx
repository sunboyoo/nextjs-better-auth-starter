"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, Mail, ShieldCheck, ShieldX } from "lucide-react"

interface UserEmailCardProps {
    userEmail: string
    emailVerified: boolean
}

export function UserEmailCard({
    userEmail,
    emailVerified,
}: UserEmailCardProps) {
    const router = useRouter()
    const [isExpanded, setIsExpanded] = useState(false)
    const [email, setEmail] = useState(userEmail)
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [message, setMessage] = useState("")

    const handleChangeEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        if (email === userEmail) {
            setMessage("Email is the same as current")
            setStatus("error")
            return
        }

        setStatus("loading")
        setMessage("Sending verification email...")

        try {
            const { error } = await authClient.changeEmail({
                newEmail: email,
            })

            if (error) {
                throw new Error(error.message)
            }

            setStatus("success")
            setMessage("Verification email sent! Please check your inbox.")
            setTimeout(() => {
                router.refresh()
                setStatus("idle")
                setMessage("")
                setIsExpanded(false)
            }, 3000)
        } catch (error: unknown) {
            setStatus("error")
            setMessage(error instanceof Error ? error.message : "Failed to change email")
        }
    }

    const handleResendVerification = async () => {
        setStatus("loading")
        setMessage("Sending verification email...")

        try {
            const { error } = await authClient.sendVerificationEmail({
                email: userEmail,
            })

            if (error) {
                throw new Error(error.message)
            }

            setStatus("success")
            setMessage("Verification email sent! Please check your inbox.")
            setTimeout(() => {
                setStatus("idle")
                setMessage("")
            }, 3000)
        } catch (error: unknown) {
            setStatus("error")
            setMessage(error instanceof Error ? error.message : "Failed to send verification email")
        }
    }

    const resetForm = () => {
        setEmail(userEmail)
        setStatus("idle")
        setMessage("")
    }

    const hasChanges = email !== userEmail

    return (
        <Card className="overflow-hidden transition-all py-0 gap-0">
            {/* Main Card Content - Clickable - Shows original data from DB */}
            <CardContent
                className="group flex cursor-pointer items-center justify-between gap-4 p-6"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/10 bg-primary/5">
                        <Mail className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold">{userEmail}</h2>
                            {emailVerified ? (
                                <Badge variant="default" className="gap-1 bg-green-600">
                                    <ShieldCheck className="h-3 w-3" />
                                    Verified
                                </Badge>
                            ) : (
                                <Badge variant="destructive" className="gap-1">
                                    <ShieldX className="h-3 w-3" />
                                    Unverified
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">Primary email address</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground transition-colors group-hover:text-primary">
                    <span className="hidden text-sm sm:inline">{isExpanded ? "Click to close" : "Click to edit"}</span>
                    {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                    ) : (
                        <ChevronDown className="h-5 w-5" />
                    )}
                </div>
            </CardContent>

            {/* Expanded Edit Section */}
            {isExpanded && (
                <div className="border-t p-6 rounded-b-xl" style={{ backgroundColor: '#f5f5f7' }}>
                    <form onSubmit={handleChangeEmail} className="space-y-4">
                        <div className="grid gap-4">
                            {/* Email Field */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter new email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={status === "loading"}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Changing your email will require verification of the new address.
                                </p>
                            </div>

                            {/* Resend Verification Option */}
                            {!emailVerified && (
                                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                        Your email is not verified.{" "}
                                        <button
                                            type="button"
                                            onClick={handleResendVerification}
                                            className="font-medium underline hover:no-underline"
                                            disabled={status === "loading"}
                                        >
                                            Resend verification email
                                        </button>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Status Message */}
                        {message && (
                            <div
                                className={`flex items-center gap-2 rounded-md p-3 text-sm ${status === "loading"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                    : status === "success"
                                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                        : status === "error"
                                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                            : ""
                                    }`}
                            >
                                {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
                                {status === "success" && <CheckCircle2 className="h-4 w-4" />}
                                {status === "error" && <XCircle className="h-4 w-4" />}
                                {message}
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
                    </form>
                </div>
            )}
        </Card>
    )
}
