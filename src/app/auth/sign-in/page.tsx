"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import { toast } from "sonner";
import SignIn from "./_components/sign-in";
import { SignUp } from "./_components/sign-up";
import { Tabs } from "@/components/ui/tabs2";
import { authClient, isGoogleOneTapConfigured } from "@/lib/auth-client";
import { getCallbackURL } from "@/lib/better-auth-official/shared";

function SignInPageContent() {
	const router = useRouter();
	const params = useSearchParams();
	const queryString = params.toString();
	const requestQuery = useMemo(() => {
		if (!queryString) {
			return undefined;
		}

		return Object.fromEntries(new URLSearchParams(queryString).entries());
	}, [queryString]);
	const callbackURL = getCallbackURL(params);

	// Google One Tap: try showing the native prompt.
	// If it succeeds, the user is signed in automatically.
	// If the prompt can't display or is dismissed, it silently degrades —
	// users can still use the Google OAuth button in the sign-in form.
	useEffect(() => {
		if (!isGoogleOneTapConfigured) {
			return;
		}

		authClient.oneTap({
			fetchOptions: {
				query: requestQuery,
				onError: (context) => {
					const message = context.error?.message || "An error occurred";
					toast.error(message);
				},
				onSuccess: () => {
					toast.success("Successfully signed in");
					router.push(callbackURL);
				},
			},
		});
	}, [callbackURL, requestQuery, router]);

	return (
		<div className="w-full">
			<div className="flex items-center flex-col justify-center w-full md:py-10">
				<div className="w-full max-w-md">
					<Tabs
						tabs={[
							{
								title: "Sign In",
								value: "sign-in",
								content: <SignIn />,
							},
							{
								title: "Sign Up",
								value: "sign-up",
								content: <SignUp />,
							},
						]}
					/>
				</div>
			</div>
		</div>
	);
}

export default function Page() {
	return (
		<Suspense fallback={null}>
			<SignInPageContent />
		</Suspense>
	);
}
