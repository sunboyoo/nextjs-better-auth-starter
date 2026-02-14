"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OrganizationDetailPage() {
    const params = useParams<{ organizationId: string }>();
    const router = useRouter();

    useEffect(() => {
        // Redirect to members tab by default
        router.replace(`/dashboard/organizations/${params.organizationId}/members`);
    }, [params.organizationId, router]);

    return null;
}
