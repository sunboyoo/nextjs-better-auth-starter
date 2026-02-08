"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUpdateUserMutation } from "@/data/user/update-user-mutation"
import { authClient } from "@/lib/auth-client"
import {
    AtSign,
    CheckCircle2,
    ChevronDown,
    Info,
    Loader2,
    Search,
    XCircle,
} from "lucide-react"

interface UserUsernameCardProps {
    userUsername: string | null | undefined
    userRole: string | null | undefined
}

type AvailabilityState = "idle" | "checking" | "available" | "taken" | "error"
type UpdateState = "idle" | "loading" | "success" | "error"

const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/
const MIN_USERNAME_LENGTH = 3
const MAX_USERNAME_LENGTH = 30

function normalize(value: string | null | undefined): string {
    return (value ?? "").trim()
}

function validateUsername(username: string): string | null {
    if (!username) {
        return "Username is required."
    }

    if (username.length < MIN_USERNAME_LENGTH) {
        return `Username must be at least ${MIN_USERNAME_LENGTH} characters.`
    }

    if (username.length > MAX_USERNAME_LENGTH) {
        return `Username must be at most ${MAX_USERNAME_LENGTH} characters.`
    }

    if (!USERNAME_REGEX.test(username)) {
        return "Username can only include letters, numbers, underscores, and dots."
    }

    return null
}

function getRoleLabel(userRole: string | null | undefined): string {
    const role = (userRole ?? "user").toLowerCase()
    if (role === "admin") return "Admin"
    if (role === "user") return "User"
    return userRole ?? "User"
}

function getRoleOperations(userRole: string | null | undefined): string[] {
    const role = (userRole ?? "user").toLowerCase()

    if (role === "admin") {
        return [
            "Check whether a username is available.",
            "Update your own username.",
            "Sign in with either email or username.",
        ]
    }

    return [
        "Check whether a username is available.",
        "Update your own username.",
        "Sign in with either email or username.",
    ]
}

export function UserUsernameCard({
    userUsername,
    userRole,
}: UserUsernameCardProps) {
    const router = useRouter()
    const updateUserMutation = useUpdateUserMutation()
    const roleLabel = getRoleLabel(userRole)
    const roleOperations = getRoleOperations(userRole)
    const initialUsername = normalize(userUsername)

    const [isExpanded, setIsExpanded] = useState(false)
    const [currentUsername, setCurrentUsername] = useState(initialUsername)
    const [nextUsername, setNextUsername] = useState(initialUsername)
    const [availabilityState, setAvailabilityState] =
        useState<AvailabilityState>("idle")
    const [availabilityMessage, setAvailabilityMessage] = useState("")
    const [updateState, setUpdateState] = useState<UpdateState>("idle")
    const [updateMessage, setUpdateMessage] = useState("")

    const normalizedNextUsername = normalize(nextUsername)
    const isChanged = normalizedNextUsername !== currentUsername
    const validationError = validateUsername(normalizedNextUsername)

    const resetForm = () => {
        setNextUsername(currentUsername)
        setAvailabilityState("idle")
        setAvailabilityMessage("")
        setUpdateState("idle")
        setUpdateMessage("")
    }

    const handleUsernameChange = (value: string) => {
        setNextUsername(value)
        setAvailabilityState("idle")
        setAvailabilityMessage("")
        if (updateState !== "loading") {
            setUpdateState("idle")
            setUpdateMessage("")
        }
    }

    const handleCheckAvailability = async () => {
        if (!isChanged) {
            setAvailabilityState("idle")
            setAvailabilityMessage("This is your current username.")
            return
        }

        if (validationError) {
            setAvailabilityState("error")
            setAvailabilityMessage(validationError)
            return
        }

        setAvailabilityState("checking")
        setAvailabilityMessage("Checking username availability...")

        const { data, error } = await authClient.isUsernameAvailable({
            username: normalizedNextUsername,
        })

        if (error) {
            setAvailabilityState("error")
            setAvailabilityMessage(
                error.message ||
                    "Could not check username availability. You can still try updating.",
            )
            return
        }

        if (data?.available) {
            setAvailabilityState("available")
            setAvailabilityMessage("Username is available.")
            return
        }

        setAvailabilityState("taken")
        setAvailabilityMessage("Username is already taken.")
    }

    const handleUpdateUsername = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!isChanged) {
            setUpdateState("error")
            setUpdateMessage("Please enter a different username.")
            return
        }

        if (validationError) {
            setUpdateState("error")
            setUpdateMessage(validationError)
            return
        }

        if (availabilityState === "taken") {
            setUpdateState("error")
            setUpdateMessage("Username is already taken.")
            return
        }

        setUpdateState("loading")
        setUpdateMessage("Updating username...")

        updateUserMutation.mutate(
            {
                username: normalizedNextUsername,
            },
            {
                onSuccess: () => {
                    setCurrentUsername(normalizedNextUsername)
                    setNextUsername(normalizedNextUsername)
                    setAvailabilityState("idle")
                    setAvailabilityMessage("")
                    setUpdateState("success")
                    setUpdateMessage("Username updated successfully.")
                    setTimeout(() => {
                        router.refresh()
                        setUpdateState("idle")
                        setUpdateMessage("")
                        setIsExpanded(false)
                    }, 1200)
                },
                onError: (error) => {
                    const message = error.message || "Failed to update username."
                    setUpdateState("error")
                    setUpdateMessage(message)
                    if (message.toLowerCase().includes("taken")) {
                        setAvailabilityState("taken")
                        setAvailabilityMessage("Username is already taken.")
                    }
                },
            },
        )
    }

    const canCheckAvailability =
        updateState !== "loading" &&
        availabilityState !== "checking" &&
        isChanged &&
        !validationError
    const canUpdate =
        updateState !== "loading" &&
        isChanged &&
        !validationError &&
        availabilityState !== "taken"

    return (
        <Card className="overflow-hidden transition-all py-0 gap-0 border-0 shadow-none">
            <CardContent
                className="group flex cursor-pointer items-center justify-between gap-4 p-6"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <AtSign className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm font-semibold">
                                {currentUsername ? `@${currentUsername}` : "No username set"}
                            </h2>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {roleLabel}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Username sign-in and profile handle
                        </p>
                    </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:text-primary ${isExpanded ? "rotate-180" : ""}`} />
            </CardContent>

            {isExpanded && (
                <div className="border-t p-6 rounded-b-xl" style={{ backgroundColor: "#fcfcfc" }}>
                    <form onSubmit={handleUpdateUsername} className="space-y-4">
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
                            <div className="flex gap-3">
                                <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div className="text-sm text-emerald-800 dark:text-emerald-200">
                                    <p className="font-medium mb-1">
                                        Username operations available for {roleLabel}:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-xs">
                                        {roleOperations.map((operation) => (
                                            <li key={operation}>{operation}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="current-username">Current Username</Label>
                                <Input
                                    id="current-username"
                                    type="text"
                                    value={currentUsername ? `@${currentUsername}` : "None"}
                                    disabled
                                    className="bg-white/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="next-username">New Username</Label>
                                <Input
                                    id="next-username"
                                    type="text"
                                    placeholder="your.username"
                                    value={nextUsername}
                                    onChange={(e) => handleUsernameChange(e.target.value)}
                                    autoCapitalize="none"
                                    autoComplete="username"
                                    disabled={updateState === "loading"}
                                />
                                <p className="text-xs text-muted-foreground">
                                    3-30 chars, letters/numbers/underscore/dot
                                </p>
                            </div>
                        </div>

                        {availabilityMessage && (
                            <div
                                className={`flex items-center gap-2 rounded-md p-3 text-sm ${availabilityState === "checking"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                    : availabilityState === "available"
                                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    }`}
                            >
                                {availabilityState === "checking" && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                {availabilityState === "available" && (
                                    <CheckCircle2 className="h-4 w-4" />
                                )}
                                {availabilityState !== "checking" &&
                                    availabilityState !== "available" && (
                                        <XCircle className="h-4 w-4" />
                                    )}
                                <span>{availabilityMessage}</span>
                            </div>
                        )}

                        {updateMessage && (
                            <div
                                className={`flex items-center gap-2 rounded-md p-3 text-sm ${updateState === "loading"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                    : updateState === "success"
                                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                        : updateState === "error"
                                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                            : ""
                                    }`}
                            >
                                {updateState === "loading" && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                {updateState === "success" && (
                                    <CheckCircle2 className="h-4 w-4" />
                                )}
                                {updateState === "error" && (
                                    <XCircle className="h-4 w-4" />
                                )}
                                <span>{updateMessage}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetForm}
                                disabled={updateState === "loading"}
                            >
                                Reset
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCheckAvailability}
                                disabled={!canCheckAvailability}
                            >
                                {availabilityState === "checking" ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Checking...
                                    </>
                                ) : (
                                    <>
                                        <Search className="mr-2 h-4 w-4" />
                                        Check Availability
                                    </>
                                )}
                            </Button>
                            <Button type="submit" disabled={!canUpdate}>
                                {updateState === "loading" ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    "Update Username"
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </Card>
    )
}
