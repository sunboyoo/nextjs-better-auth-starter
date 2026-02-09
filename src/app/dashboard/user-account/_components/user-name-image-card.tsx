"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUpdateUserMutation } from "@/data/user/update-user-mutation"
import { ChevronDown, Loader2, CheckCircle2, XCircle, ImageIcon, Upload, Link2 } from "lucide-react"

interface UserNameImageCardProps {
    userName: string | null | undefined
    userEmail: string
    userImage: string | null | undefined
}

// Helper to normalize props
function normalizeString(value: string | null | undefined): string {
    return value ?? ""
}

function getInitialImageUrl(image: string): string {
    return image.startsWith("data:") ? "" : image
}

export function UserNameImageCard({
    userName,
    userEmail,
    userImage,
}: UserNameImageCardProps) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Normalize props to always be strings
    const normalizedUserName = normalizeString(userName)
    const normalizedUserImage = normalizeString(userImage)

    // Initialize state with normalized values
    const [isExpanded, setIsExpanded] = useState(false)
    const [name, setName] = useState(() => normalizedUserName)
    const [image, setImage] = useState(() => normalizedUserImage)
    const [imageUrl, setImageUrl] = useState(() => getInitialImageUrl(normalizedUserImage))
    const [imageInputMode, setImageInputMode] = useState<"url" | "upload">("url")
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [message, setMessage] = useState("")
    const [previewError, setPreviewError] = useState(false)

    const updateUserMutation = useUpdateUserMutation()

    // Get initials for avatar fallback
    const displayName = normalizedUserName || "Anonymous User"
    const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith("image/")) {
            setStatus("error")
            setMessage("Please select a valid image file.")
            return
        }

        // Validate file size (max 2MB for base64)
        if (file.size > 2 * 1024 * 1024) {
            setStatus("error")
            setMessage("Image size must be less than 2MB.")
            return
        }

        // Convert to base64
        const reader = new FileReader()
        reader.onloadend = () => {
            const base64String = reader.result as string
            setImage(base64String)
            setImageUrl("") // Clear URL when uploading
            setPreviewError(false)
            setStatus("idle")
            setMessage("")
        }
        reader.onerror = () => {
            setStatus("error")
            setMessage("Failed to read the image file.")
        }
        reader.readAsDataURL(file)
    }

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value
        setImageUrl(url)
        setImage(url)
        setPreviewError(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus("loading")
        setMessage("Updating...")

        const updates: { name?: string; image?: string } = {}
        if (name && name !== normalizedUserName) updates.name = name
        if (image && image !== normalizedUserImage) updates.image = image

        if (Object.keys(updates).length === 0) {
            setStatus("idle")
            setMessage("")
            return
        }

        updateUserMutation.mutate(updates, {
            onSuccess: () => {
                setStatus("success")
                setMessage("Profile updated successfully!")
                // Refresh to sync the latest session-backed profile data
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
        setName(normalizedUserName)
        setImage(normalizedUserImage)
        setImageUrl(getInitialImageUrl(normalizedUserImage))
        setPreviewError(false)
        setStatus("idle")
        setMessage("")
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const hasChanges =
        (name !== normalizedUserName) ||
        (image !== normalizedUserImage)

    return (
        <Card className="overflow-hidden transition-all py-0 gap-0 border-0 shadow-none">
            {/* Main Card Content - Clickable */}
            <CardContent
                className="group flex cursor-pointer items-center justify-between gap-4 p-6"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 rounded-full">
                        <AvatarImage src={normalizedUserImage || undefined} alt={displayName} className="rounded-full" />
                        <AvatarFallback className="rounded-full bg-violet-100 text-xs font-semibold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-sm font-semibold">{displayName}</h2>
                        <p className="text-xs text-muted-foreground">{userEmail}</p>
                    </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:text-primary ${isExpanded ? "rotate-180" : ""}`} />
            </CardContent>

            {/* Expanded Edit Section */}
            {isExpanded && (
                <div className="border-t p-6 rounded-b-xl" style={{ backgroundColor: '#fcfcfc' }}>
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
                            {/* Image Input Mode Toggle */}
                            <div className="space-y-2">
                                <Label>Profile Image</Label>
                                <Tabs
                                    value={imageInputMode}
                                    onValueChange={(value) => setImageInputMode(value as "url" | "upload")}
                                    className="w-full"
                                >
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="upload" disabled={status === "loading"}>
                                            <Upload className="mr-2 h-4 w-4" />
                                            Upload Image
                                        </TabsTrigger>
                                        <TabsTrigger value="url" disabled={status === "loading"}>
                                            <Link2 className="mr-2 h-4 w-4" />
                                            Paste URL
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="upload" className="mt-3 space-y-2">
                                        <Label htmlFor="image-upload">Upload Image (max 2MB)</Label>
                                        <Input
                                            key="image-upload-input"
                                            ref={fileInputRef}
                                            id="image-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            disabled={status === "loading"}
                                            className="cursor-pointer"
                                        />
                                    </TabsContent>
                                    <TabsContent value="url" className="mt-3 space-y-2">
                                        <Label htmlFor="image-url">Image URL</Label>
                                        <Input
                                            key="image-url-input"
                                            id="image-url"
                                            type="url"
                                            placeholder="https://example.com/avatar.jpg"
                                            value={imageUrl}
                                            onChange={handleUrlChange}
                                            disabled={status === "loading"}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </div>

                            {/* Image Preview */}
                            <div className="mt-1">
                                <p className="mb-2 text-xs text-muted-foreground">Image Preview</p>
                                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border bg-white relative">
                                    {image && !previewError ? (
                                        <Image
                                            src={image}
                                            alt="Preview"
                                            fill
                                            className="object-cover"
                                            unoptimized
                                            onError={() => setPreviewError(true)}
                                        />
                                    ) : (
                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                    )}
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
