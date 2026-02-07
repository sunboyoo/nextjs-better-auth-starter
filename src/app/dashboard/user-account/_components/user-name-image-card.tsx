"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUpdateUserMutation } from "@/data/user/update-user-mutation"
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, ImageIcon } from "lucide-react"

interface UserNameImageCardProps {
    userName: string | null | undefined
    userEmail: string
    userImage: string | null | undefined
}

export function UserNameImageCard({
    userName,
    userEmail,
    userImage,
}: UserNameImageCardProps) {
    const router = useRouter()
    const [isExpanded, setIsExpanded] = useState(false)
    const [name, setName] = useState(userName || "")
    const [image, setImage] = useState(userImage || "")
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [message, setMessage] = useState("")

    const updateUserMutation = useUpdateUserMutation()

    // Get initials for avatar fallback - use original data from DB
    const displayName = userName || "Anonymous User"
    const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus("loading")
        setMessage("Updating...")

        const updates: { name?: string; image?: string } = {}
        if (name && name !== userName) updates.name = name
        if (image && image !== userImage) updates.image = image

        if (Object.keys(updates).length === 0) {
            setStatus("idle")
            setMessage("")
            return
        }

        updateUserMutation.mutate(updates, {
            onSuccess: () => {
                setStatus("success")
                setMessage("Profile updated successfully!")
                // Refresh the page to fetch updated data from DB
                setTimeout(() => {
                    router.refresh()
                    setStatus("idle")
                    setMessage("")
                    setIsExpanded(false)
                }, 1500)
            },
            onError: (error) => {
                setStatus("error")
                setMessage(error.message || "Failed to update profile")
            },
        })
    }

    const resetForm = () => {
        setName(userName || "")
        setImage(userImage || "")
        setStatus("idle")
        setMessage("")
    }

    const hasChanges = (name !== (userName || "")) || (image !== (userImage || ""))

    return (
        <Card className="overflow-hidden transition-all py-0 gap-0">
            {/* Main Card Content - Clickable - Shows original data from DB */}
            <CardContent
                className="group flex cursor-pointer items-center justify-between gap-4 p-6"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/10">
                        <AvatarImage src={userImage || undefined} alt={displayName} />
                        <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-xl font-semibold">{displayName}</h2>
                        <p className="text-sm text-muted-foreground">{userEmail}</p>
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
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4">
                            {/* Name Field */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Enter your name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={status === "loading"}
                                />
                            </div>

                            {/* Image URL Field with Preview */}
                            <div className="space-y-2">
                                <Label htmlFor="image">Profile Image URL</Label>
                                <Input
                                    id="image"
                                    type="url"
                                    placeholder="https://example.com/avatar.jpg"
                                    value={image}
                                    onChange={(e) => setImage(e.target.value)}
                                    disabled={status === "loading"}
                                />
                                {/* Image Preview */}
                                <div className="mt-3">
                                    <p className="mb-2 text-xs text-muted-foreground">Image Preview</p>
                                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-white">
                                        {image ? (
                                            <img
                                                src={image}
                                                alt="Preview"
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                                }}
                                            />
                                        ) : null}
                                        <ImageIcon className={`h-8 w-8 text-muted-foreground ${image ? 'hidden' : ''}`} />
                                    </div>
                                </div>
                            </div>
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
                                        Updating...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </Card>
    )
}
