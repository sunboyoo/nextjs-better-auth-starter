"use client";

import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ForgetPasswordForm } from "@/components/forms/forget-password-form";
import { ResetPasswordEmailOtpForm } from "@/components/forms/reset-password-email-otp-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Page() {
	const router = useRouter();
	const [isSubmitted, setIsSubmitted] = useState(false);

	if (isSubmitted) {
		return (
			<main className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
				<Card className="w-[350px]">
					<CardHeader>
						<CardTitle>Check your email</CardTitle>
						<CardDescription>
							We&apos;ve sent a password reset link to your email.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Alert variant="default">
							<CheckCircle2 className="h-4 w-4" />
							<AlertDescription>
								If you don&apos;t see the email, check your spam folder.
							</AlertDescription>
						</Alert>
					</CardContent>
					<CardFooter className="flex justify-center">
						<Link href="/auth/sign-in">
							<Button variant="link" className="px-0 gap-2">
								<ArrowLeft size={15} />
								Back to sign in
							</Button>
						</Link>
					</CardFooter>
				</Card>
			</main>
		);
	}

	return (
		<main className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Forgot password</CardTitle>
					<CardDescription>
						Use a reset link or reset my password with an email OTP.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue="link" className="w-full">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="link">Reset Link</TabsTrigger>
							<TabsTrigger value="otp">Email OTP</TabsTrigger>
						</TabsList>
						<TabsContent value="link" className="mt-4">
							<ForgetPasswordForm onSuccess={() => setIsSubmitted(true)} />
						</TabsContent>
						<TabsContent value="otp" className="mt-4">
							<ResetPasswordEmailOtpForm
								onSuccess={() => router.push("/auth/sign-in")}
							/>
						</TabsContent>
					</Tabs>
				</CardContent>
				<CardFooter className="flex justify-center">
					<Link href="/auth/sign-in">
						<Button variant="link" className="px-0 gap-2">
							<ArrowLeft size={15} />
							Back to sign in
						</Button>
					</Link>
				</CardFooter>
			</Card>
		</main>
	);
}
