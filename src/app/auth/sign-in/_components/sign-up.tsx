"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SignUpForm } from "@/components/forms/sign-up-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getCallbackURL } from "@/lib/better-auth-official/shared";

export function SignUp() {
	const router = useRouter();
	const params = useSearchParams();
	const callbackURL = getCallbackURL(params);

	return (
		<Card className="rounded-md rounded-t-none w-full">
			<CardHeader>
				<CardTitle className="text-lg md:text-xl">Sign Up</CardTitle>
				<CardDescription className="text-xs md:text-sm">
					Enter my information to create an account
				</CardDescription>
			</CardHeader>
			<CardContent>
				<SignUpForm
					params={params}
					onSuccess={() =>
						router.push(
							`/auth/sign-in?callbackUrl=${encodeURIComponent(callbackURL)}`,
						)
					}
					callbackURL={callbackURL}
				/>
			</CardContent>
		</Card>
	);
}
