"use client";

import { AlertTriangle, Loader2, StopCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { stopImpersonationAction } from "@/app/dashboard/_actions/stop-impersonation";

export function ImpersonationBanner() {
	const router = useRouter();
	const [isStopping, setIsStopping] = useState(false);

	return (
		<Alert className="border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100">
			<AlertTriangle />
			<AlertTitle>Impersonation mode is active</AlertTitle>
			<AlertDescription className="w-full">
				<div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-amber-900/90 dark:text-amber-100/90">
						You are currently browsing as another user.
					</p>
					<Button
						type="button"
						size="sm"
						variant="secondary"
						className="gap-2"
						disabled={isStopping}
						onClick={async () => {
							setIsStopping(true);
							const result = await stopImpersonationAction();
							setIsStopping(false);

							if (!result.success) {
								toast.error(result.error);
								return;
							}

							toast.success("Impersonation stopped");
							router.push("/admin/users");
							router.refresh();
						}}
					>
						{isStopping ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<StopCircle className="h-4 w-4" />
						)}
						Stop impersonation
					</Button>
				</div>
			</AlertDescription>
		</Alert>
	);
}
