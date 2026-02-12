import { NextResponse } from "next/server";

type ErrorLike = {
    status?: number;
    message?: string;
    body?: {
        message?: string;
        error?: string;
    };
    cause?: {
        message?: string;
    };
};

export function handleApiError(error: unknown, action: string) {
    console.error(`Error trying to ${action}:`, error);

    const errorLike = error as ErrorLike;
    const status =
        typeof errorLike?.status === "number" &&
        errorLike.status >= 400 &&
        errorLike.status < 600
            ? errorLike.status
            : null;
    const message =
        errorLike?.body?.message ||
        errorLike?.body?.error ||
        errorLike?.message ||
        errorLike?.cause?.message ||
        null;

    if (status) {
        return NextResponse.json(
            { error: message || `Failed to ${action}` },
            { status },
        );
    }

    return NextResponse.json(
        { error: `Failed to ${action}` },
        { status: 500 }
    );
}
