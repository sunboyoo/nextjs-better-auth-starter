"use server"

import { auth } from "@/lib/auth"
import { cookies, headers } from "next/headers"

type BetterAuthErrorLike = {
    status?: string
    message?: string
    body?: {
        message?: string
    }
}

function getSetPasswordErrorMessage(error: unknown): string {
    const authError = error as BetterAuthErrorLike

    if (typeof authError?.body?.message === "string" && authError.body.message.trim().length > 0) {
        return authError.body.message
    }

    if (typeof authError?.message === "string" && authError.message.trim().length > 0) {
        return authError.message
    }

    if (authError?.status === "UNAUTHORIZED") {
        return "Your session has expired. Please sign in again and try setting a password."
    }

    return "Failed to set password"
}

export async function setPasswordAction(newPassword: string) {
    try {
        const requestHeaders = new Headers(await headers())
        const cookieHeader = (await cookies()).toString()

        // Ensure Better Auth receives the session cookie in server action context.
        if (cookieHeader) {
            requestHeaders.set("cookie", cookieHeader)
        }

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
            error: getSetPasswordErrorMessage(error),
        }
    }
}
