"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    ShieldCheck,
    ShieldAlert,
    QrCode,
    FileKey,
    Loader2,
    Copy,
    Check
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { authClient } from "@/lib/auth-client"
import { TwoFactorEnableForm } from "@/components/forms/two-factor-enable-form"
import { TwoFactorDisableForm } from "@/components/forms/two-factor-disable-form"
import { TwoFactorQrForm } from "@/components/forms/two-factor-qr-form"

interface UserTwoFactorCardProps {
    twoFactorEnabled: boolean
}

export function UserTwoFactorCard({ twoFactorEnabled }: UserTwoFactorCardProps) {
    const router = useRouter()
    const [isEnableOpen, setIsEnableOpen] = useState(false)
    const [isDisableOpen, setIsDisableOpen] = useState(false)
    const [isQrOpen, setIsQrOpen] = useState(false)
    const [isBackupOpen, setIsBackupOpen] = useState(false)

    // Backup Codes State
    const [backupPassword, setBackupPassword] = useState("")
    const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
    const [isGeneratingBackup, setIsGeneratingBackup] = useState(false)
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

    const handleGenerateBackupCodes = async () => {
        if (!backupPassword) {
            toast.error("Password is required")
            return
        }

        setIsGeneratingBackup(true)
        try {
            const { data, error } = await authClient.twoFactor.generateBackupCodes({
                password: backupPassword,
            })

            if (error) {
                toast.error(error.message || "Failed to generate backup codes")
            } else if (data) {
                setBackupCodes(data.backupCodes)
                toast.success("Backup codes generated successfully")
            }
        } catch {
            toast.error("An error occurred while generating backup codes")
        } finally {
            setIsGeneratingBackup(false)
        }
    }

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text)
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
    }

    const resetBackupState = () => {
        setBackupPassword("")
        setBackupCodes(null)
        setIsBackupOpen(false)
    }

    return (
        <Card className="py-0 gap-0 overflow-hidden">
            <CardContent className="p-0">
                {/* Header */}
                <div className="flex items-center justify-between border-b bg-muted/30 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${twoFactorEnabled
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                            }`}>
                            {twoFactorEnabled ? (
                                <ShieldCheck className="h-5 w-5" />
                            ) : (
                                <ShieldAlert className="h-5 w-5" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold">Two-Factor Authentication</h3>
                            <p className="text-xs text-muted-foreground">
                                Add an extra layer of security to your account
                            </p>
                        </div>
                    </div>
                    <Badge variant={twoFactorEnabled ? "default" : "destructive"}>
                        {twoFactorEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                </div>

                {/* Content Actions */}
                <div className="p-6">
                    {twoFactorEnabled ? (
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-muted-foreground">
                                <p>
                                    Two-factor authentication is currently <strong>enabled</strong>.
                                    We recommend keeping this on for better security.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {/* View QR Code */}
                                <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-2">
                                            <QrCode className="h-4 w-4" />
                                            View QR Code
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>Scan QR Code</DialogTitle>
                                            <DialogDescription>
                                                Use your authenticator app to scan this QR code.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <TwoFactorQrForm />
                                    </DialogContent>
                                </Dialog>

                                {/* Generate Backup Codes */}
                                <Dialog open={isBackupOpen} onOpenChange={(open) => {
                                    if (!open) resetBackupState()
                                    setIsBackupOpen(open)
                                }}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-2">
                                            <FileKey className="h-4 w-4" />
                                            Backup Codes
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px]">
                                        <DialogHeader>
                                            <DialogTitle>Backup Codes</DialogTitle>
                                            <DialogDescription>
                                                Generate backup codes to access your account if you lose your device.
                                                Keep these safe.
                                            </DialogDescription>
                                        </DialogHeader>

                                        {!backupCodes ? (
                                            <div className="space-y-4 py-2">
                                                <Alert variant="destructive">
                                                    <AlertTitle>Warning</AlertTitle>
                                                    <AlertDescription>
                                                        Generating new backup codes will invalidate any previous codes.
                                                    </AlertDescription>
                                                </Alert>
                                                <div className="space-y-2">
                                                    <Label htmlFor="backup-password">Confirm Password</Label>
                                                    <Input
                                                        id="backup-password"
                                                        type="password"
                                                        value={backupPassword}
                                                        onChange={(e) => setBackupPassword(e.target.value)}
                                                        placeholder="Enter your current password"
                                                    />
                                                </div>
                                                <Button
                                                    onClick={handleGenerateBackupCodes}
                                                    disabled={isGeneratingBackup || !backupPassword}
                                                    className="w-full"
                                                >
                                                    {isGeneratingBackup ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        "Generate Codes"
                                                    )}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-2">
                                                    {backupCodes.map((code, index) => (
                                                        <div
                                                            key={index}
                                                            className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm font-mono"
                                                        >
                                                            <span>{code}</span>
                                                            <button
                                                                onClick={() => copyToClipboard(code, index)}
                                                                className="ml-2 text-muted-foreground hover:text-foreground"
                                                                title="Copy code"
                                                            >
                                                                {copiedIndex === index ? (
                                                                    <Check className="h-3 w-3 text-green-500" />
                                                                ) : (
                                                                    <Copy className="h-3 w-3" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-muted-foreground text-center">
                                                    Download or copy these codes and store them in a secure place.
                                                </p>
                                                <Button onClick={resetBackupState} className="w-full">
                                                    Done
                                                </Button>
                                            </div>
                                        )}
                                    </DialogContent>
                                </Dialog>

                                {/* Disable 2FA */}
                                <Dialog open={isDisableOpen} onOpenChange={setIsDisableOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="destructive" size="sm" className="gap-2">
                                            <ShieldAlert className="h-4 w-4" />
                                            Disable 2FA
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                                            <DialogDescription>
                                                Are you sure? This will reduce your account security.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <TwoFactorDisableForm onSuccess={() => {
                                            setIsDisableOpen(false)
                                            router.refresh()
                                        }} />
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-muted-foreground">
                                <p>
                                    Secure your account with two-factor authentication.
                                    You will need an authenticator app like Google Authenticator or Authy.
                                </p>
                            </div>
                            <Dialog open={isEnableOpen} onOpenChange={setIsEnableOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-2">
                                        <ShieldCheck className="h-4 w-4" />
                                        Enable 2FA
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                                        <DialogDescription>
                                            Follow the steps to set up 2FA for your account.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <TwoFactorEnableForm onSuccess={() => {
                                        setIsEnableOpen(false)
                                        router.refresh()
                                    }} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
