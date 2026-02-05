/**
 * Session type definitions for client-side use
 */
export interface SessionWithUser {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
    ipAddress: string | null;
    userAgent: string | null;
    impersonatedBy: string | null;
    activeOrganizationId: string | null;
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
}

/**
 * Parse user agent string to get device info
 */
export function parseUserAgent(userAgent: string | null): {
    browser: string;
    os: string;
    device: string;
} {
    if (!userAgent) {
        return { browser: "Unknown", os: "Unknown", device: "Unknown" };
    }

    // Browser detection
    let browser = "Unknown";
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
        browser = "Chrome";
    } else if (userAgent.includes("Firefox")) {
        browser = "Firefox";
    } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
        browser = "Safari";
    } else if (userAgent.includes("Edg")) {
        browser = "Edge";
    } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
        browser = "Opera";
    }

    // OS detection
    let os = "Unknown";
    if (userAgent.includes("Windows")) {
        os = "Windows";
    } else if (userAgent.includes("Mac OS X")) {
        os = "macOS";
    } else if (userAgent.includes("Linux")) {
        os = "Linux";
    } else if (userAgent.includes("Android")) {
        os = "Android";
    } else if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) {
        os = "iOS";
    }

    // Device detection
    let device = "Desktop";
    if (userAgent.includes("Mobile") || userAgent.includes("Android")) {
        device = "Mobile";
    } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
        device = "Tablet";
    }

    return { browser, os, device };
}
