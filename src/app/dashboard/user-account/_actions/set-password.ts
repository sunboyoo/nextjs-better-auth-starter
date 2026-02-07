"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function setPasswordAction(newPassword: string) {
    try {
        const requestHeaders = await headers()

        await auth.api.setPassword({
            body: {
                newPassword,
            },
            headers: requestHeaders,
        })

        return { success: true, error: null }
    } catch (error: unknown) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to set password",
        }
    }
}
