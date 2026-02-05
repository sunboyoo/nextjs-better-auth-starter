import { NextResponse } from "next/server";

export function handleApiError(error: unknown, action: string) {
    console.error(`Error trying to ${action}:`, error);
    return NextResponse.json(
        { error: `Failed to ${action}` },
        { status: 500 }
    );
}
