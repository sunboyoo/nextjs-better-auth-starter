"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/data/query-client";
import { authClient } from "@/lib/auth-client";

export function AppQueryClientProvider({
	children,
}: {
	children: ReactNode;
}) {
	const queryClient = getQueryClient();

	useEffect(() => {
		const intervalId = authClient.ensureElectronRedirect();
		return () => clearInterval(intervalId);
	}, []);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
