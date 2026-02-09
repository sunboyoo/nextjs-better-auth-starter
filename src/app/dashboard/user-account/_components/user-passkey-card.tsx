"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    KeyRound,
    Plus,
    Fingerprint,
    Trash2,
    Loader2,
    Clock,
    Smartphone,
    Laptop,
    AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
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

type Passkey = {
    id: string
    name?: string | null
    createdAt: Date
    deviceType?: string | null
}

interface UserPasskeyCardProps {
    initialPasskeys: Passkey[]
}

function formatDate(date: Date | string) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(date))
}

function getDeviceIcon(deviceType: string | null | undefined) {
    if (deviceType === "singleDevice" || deviceType === "platform") {
        return Smartphone
    }
    return Laptop
}

export function UserPasskeyCard({ initialPasskeys }: UserPasskeyCardProps) {
    const router = useRouter()
    const { data: passkeys } = authClient.useListPasskeys()
    const currentPasskeys = passkeys ?? initialPasskeys

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [passkeyName, setPasskeyName] = useState("")
    const [isAddingPasskey, setIsAddingPasskey] = useState(false)

    const [deleteTarget, setDeleteTarget] = useState<Passkey | null>(null)
    const [isDeletingPasskey, setIsDeletingPasskey] = useState(false)

    const handleAddPasskey = async () => {
        if (!passkeyName.trim()) {
            toast.error("Please enter a name for your passkey")
            return
        }

        setIsAddingPasskey(true)
        try {
            const { error } = await authClient.passkey.addPasskey({
                name: passkeyName.trim(),
            })

            if (error) {
                toast.error(error.message || "Failed to add passkey")
            } else {
                toast.success("Passkey added successfully")
                setPasskeyName("")
                setIsAddDialogOpen(false)
                router.refresh()
            }
        } catch {
            toast.error("Failed to add passkey. Make sure your browser supports WebAuthn.")
        } finally {
            setIsAddingPasskey(false)
        }
    }

    const handleDeletePasskey = async () => {
        if (!deleteTarget) return

        setIsDeletingPasskey(true)
        try {
            const { error } = await authClient.passkey.deletePasskey({
                id: deleteTarget.id,
            })

            if (error) {
                toast.error(error.message || "Failed to delete passkey")
            } else {
                toast.success("Passkey deleted successfully")
                router.refresh()
            }
        } catch {
            toast.error("Failed to delete passkey")
        } finally {
            setIsDeletingPasskey(false)
            setDeleteTarget(null)
        }
    }

    const passkeyCount = currentPasskeys.length

    return (
        <>
            <Card className="py-0 gap-0 overflow-hidden border-0 shadow-none">
                <CardContent className="p-0">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                                <KeyRound className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold">Passkeys</h3>
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-black text-white hover:bg-black/90">
                                        {passkeyCount} {passkeyCount === 1 ? "passkey" : "passkeys"}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Password-free sign-in with biometrics or security keys
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-1.5">
                                        <Plus className="h-4 w-4" />
                                        <span className="hidden sm:inline">Add Passkey</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Add New Passkey</DialogTitle>
                                        <DialogDescription>
                                            Give your passkey a name to help you identify it later.
                                            Your browser will guide you through the setup process.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="passkey-name">Passkey Name</Label>
                                            <Input
                                                id="passkey-name"
                                                placeholder="e.g., MacBook Pro, iPhone 15"
                                                value={passkeyName}
                                                onChange={(e) => setPasskeyName(e.target.value)}
                                                disabled={isAddingPasskey}
                                            />
                                        </div>
                                        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                                            <div className="flex gap-2 text-sm text-blue-800 dark:text-blue-200">
                                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                                <span>
                                                    After clicking Create, follow your browser&apos;s prompts
                                                    to register your fingerprint, face, or security key.
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsAddDialogOpen(false)}
                                            disabled={isAddingPasskey}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleAddPasskey}
                                            disabled={isAddingPasskey || !passkeyName.trim()}
                                        >
                                            {isAddingPasskey ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <Fingerprint className="mr-2 h-4 w-4" />
                                                    Create Passkey
                                                </>
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Passkey List */}
                    {passkeyCount > 0 ? (
                        <div className="divide-y bg-[#fcfcfc]">
                            {currentPasskeys.map((passkey) => {
                                const DeviceIcon = getDeviceIcon(passkey.deviceType)
                                return (
                                    <div
                                        key={passkey.id}
                                        className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted/20"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                                <DeviceIcon className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-medium text-sm">
                                                    {passkey.name || "Unnamed Passkey"}
                                                </p>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    Added {formatDate(passkey.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setDeleteTarget(passkey)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete passkey</span>
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center bg-[#fcfcfc]">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground/50">
                                <KeyRound className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">
                                    No passkeys registered
                                </p>
                                <p className="text-xs text-muted-foreground/70">
                                    Add a passkey to sign in without a password
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Passkey</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{deleteTarget?.name || "Unnamed Passkey"}&quot;?
                            You will no longer be able to use this passkey to sign in.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingPasskey}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeletePasskey}
                            disabled={isDeletingPasskey}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            {isDeletingPasskey ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
