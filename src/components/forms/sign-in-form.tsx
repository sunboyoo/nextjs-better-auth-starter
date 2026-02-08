"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { CaptchaField } from "@/components/captcha/captcha-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import {
	buildMagicLinkSentURL,
	buildMagicLinkErrorCallbackURL,
	buildMagicLinkNewUserCallbackURL,
} from "@/lib/magic-link";
import { getCaptchaHeaders, isCaptchaEnabled } from "@/lib/captcha";
import { LastUsedIndicator } from "../last-used-indicator";

const subscribe = () => () => {};

const signInSchema = z.object({
	email: z.email("Please enter a valid email address."),
	password: z.string().min(1, "Password is required."),
	rememberMe: z.boolean(),
});

type SignInFormValues = z.infer<typeof signInSchema>;

interface SignInFormProps {
	onSuccess?: () => void;
	callbackURL?: string;
	showPasswordToggle?: boolean;
	params?: URLSearchParams;
	magicLinkNewUserCallbackURL?: string;
	magicLinkErrorCallbackURL?: string;
}

export function SignInForm({
	onSuccess,
	callbackURL = "/dashboard",
	showPasswordToggle = false,
	params,
	magicLinkNewUserCallbackURL,
	magicLinkErrorCallbackURL,
}: SignInFormProps) {
	const router = useRouter();
	const [loading, startTransition] = useTransition();
	const [pendingAction, setPendingAction] = useState<
		"password" | "magic" | "email-otp-send" | "email-otp-verify" | null
	>(null);
	const [emailOtpCode, setEmailOtpCode] = useState("");
	const [emailOtpSentTo, setEmailOtpSentTo] = useState<string | null>(null);
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	const [captchaWidgetKey, setCaptchaWidgetKey] = useState(0);
	const isMounted = useSyncExternalStore(subscribe, () => true, () => false);
	const captchaEnabled = isCaptchaEnabled();
	const newUserCallbackURL =
		magicLinkNewUserCallbackURL ??
		buildMagicLinkNewUserCallbackURL(callbackURL);
	const errorCallbackURL =
		magicLinkErrorCallbackURL ?? buildMagicLinkErrorCallbackURL(callbackURL);
	const requestQuery = params ? Object.fromEntries(params.entries()) : undefined;

	const form = useForm<SignInFormValues>({
		resolver: zodResolver(signInSchema),
		defaultValues: {
			email: "",
			password: "",
			rememberMe: false,
		},
	});
	const verificationQuery = new URLSearchParams({
		callbackUrl: callbackURL,
	});
	const verificationEmail = form.watch("email");
	if (verificationEmail) {
		verificationQuery.set("email", verificationEmail.trim().toLowerCase());
	}
	const verifyEmailOtpHref = `/auth/email-otp/verify-email?${verificationQuery.toString()}`;
	const resetCaptcha = () => {
		if (!captchaEnabled) return;
		setCaptchaToken(null);
		setCaptchaWidgetKey((current) => current + 1);
	};
	const ensureCaptchaToken = (): boolean => {
		if (!captchaEnabled) return true;
		if (captchaToken) return true;

		toast.error("Complete the captcha challenge before continuing.");
		return false;
	};

	const onSubmit = (data: SignInFormValues) => {
		setPendingAction("password");
		startTransition(async () => {
			try {
				if (!ensureCaptchaToken()) return;

				await authClient.signIn.email(
					{
						email: data.email,
						password: data.password,
						rememberMe: data.rememberMe,
						callbackURL,
					},
					{
						query: requestQuery,
						headers: getCaptchaHeaders(captchaToken),
						onSuccess() {
							toast.success("Successfully signed in");
							onSuccess?.();
						},
						onError(context) {
							const message = context.error.message || "Sign in failed.";
							if (message.toLowerCase().includes("email not verified")) {
								toast.error(
									"Email not verified. We sent a new verification email. Check your inbox and spam folder.",
								);
								return;
							}
							toast.error(message);
						},
					},
				);
			} finally {
				resetCaptcha();
				setPendingAction(null);
			}
		});
	};

	const onMagicLink = () => {
		setPendingAction("magic");
		startTransition(async () => {
			try {
				const isEmailValid = await form.trigger("email");
				if (!isEmailValid) return;

				const email = form.getValues("email");
				await authClient.signIn.magicLink(
					{
						email,
						callbackURL,
						newUserCallbackURL: newUserCallbackURL,
						errorCallbackURL: errorCallbackURL,
					},
					{
						query: requestQuery,
						onSuccess() {
							router.push(buildMagicLinkSentURL(email, callbackURL));
						},
						onError(context) {
							toast.error(
								context.error.message || "Failed to send magic link.",
							);
						},
					},
				);
			} finally {
				setPendingAction(null);
			}
		});
	};

	const onSendEmailOtp = () => {
		setPendingAction("email-otp-send");
		startTransition(async () => {
			try {
				const isEmailValid = await form.trigger("email");
				if (!isEmailValid) return;

				const email = form.getValues("email").trim().toLowerCase();
				await authClient.emailOtp.sendVerificationOtp(
					{
						email,
						type: "sign-in",
					},
					{
						query: requestQuery,
						onSuccess() {
							setEmailOtpSentTo(email);
							setEmailOtpCode("");
							toast.success(
								"Email OTP sent. Check your inbox and spam folder.",
							);
						},
						onError(context) {
							toast.error(
								context.error.message || "Failed to send email OTP.",
							);
						},
					},
				);
			} finally {
				setPendingAction(null);
			}
		});
	};

	const onSignInWithEmailOtp = () => {
		setPendingAction("email-otp-verify");
		startTransition(async () => {
			try {
				if (!emailOtpSentTo) {
					toast.error("Send an OTP code first.");
					return;
				}

				const otp = emailOtpCode.trim();
				if (!otp || !/^\d+$/.test(otp)) {
					toast.error("Enter a valid OTP code.");
					return;
				}

				await authClient.signIn.emailOtp(
					{
						email: emailOtpSentTo,
						otp,
					},
					{
						query: requestQuery,
						onSuccess() {
							toast.success("Successfully signed in with email OTP");
							onSuccess?.();
						},
						onError(context) {
							toast.error(
								context.error.message || "Email OTP sign-in failed.",
							);
						},
					},
				);
			} finally {
				setPendingAction(null);
			}
		});
	};

	return (
			<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-2">
			<FieldGroup>
				<Controller
					name="email"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
							<Input
								{...field}
								id="sign-in-email"
								type="email"
								placeholder="m@example.com"
								aria-invalid={fieldState.invalid}
								autoComplete="email"
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
				<div className="text-right">
					<Link
						href={verifyEmailOtpHref}
						className="inline-block text-xs underline text-foreground"
					>
						Verify email with OTP
					</Link>
				</div>
				<Controller
					name="password"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<div className="flex items-center">
								<FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
								<Link
									href="/auth/forget-password"
									className="ml-auto inline-block text-sm underline text-foreground"
								>
									Forgot your password?
								</Link>
							</div>
							{showPasswordToggle ? (
								<PasswordInput
									{...field}
									id="sign-in-password"
									placeholder="Password"
									aria-invalid={fieldState.invalid}
									autoComplete="current-password"
								/>
							) : (
								<Input
									{...field}
									id="sign-in-password"
									type="password"
									placeholder="password"
									aria-invalid={fieldState.invalid}
									autoComplete="current-password"
								/>
							)}
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
				<Controller
					name="rememberMe"
					control={form.control}
					render={({ field }) => (
						<Field orientation="horizontal">
							<Checkbox
								id="sign-in-remember"
								checked={field.value}
								onCheckedChange={field.onChange}
							/>
							<FieldLabel htmlFor="sign-in-remember" className="font-normal">
								Remember me
							</FieldLabel>
						</Field>
					)}
				/>
			</FieldGroup>
			<CaptchaField
				widgetKey={captchaWidgetKey}
				onTokenChange={setCaptchaToken}
			/>
			<Button type="submit" className="w-full relative" disabled={loading}>
				{loading && pendingAction === "password" ? (
					<Loader2 size={16} className="animate-spin" />
				) : (
					"Login"
				)}
				{isMounted && authClient.isLastUsedLoginMethod("email") && (
					<LastUsedIndicator />
				)}
			</Button>
			<Button
				type="button"
				variant="outline"
				className="w-full"
				disabled={loading}
				onClick={onMagicLink}
			>
				{loading && pendingAction === "magic" ? (
					<Loader2 size={16} className="animate-spin" />
				) : (
					"Email me a magic link"
				)}
			</Button>
			<div className="rounded-md border p-3 space-y-3">
				<Button
					type="button"
					variant="outline"
					className="w-full"
					disabled={loading}
					onClick={onSendEmailOtp}
				>
					{loading && pendingAction === "email-otp-send" ? (
						<Loader2 size={16} className="animate-spin" />
					) : emailOtpSentTo ? (
						"Resend email OTP"
					) : (
						"Send email OTP"
					)}
				</Button>
				{emailOtpSentTo && (
					<>
						<p className="text-xs text-muted-foreground">
							OTP sent to {emailOtpSentTo}
						</p>
						<Field>
							<FieldLabel htmlFor="sign-in-email-otp">Email OTP</FieldLabel>
							<Input
								id="sign-in-email-otp"
								value={emailOtpCode}
								onChange={(event) =>
									setEmailOtpCode(event.target.value.replace(/[^\d]/g, ""))
								}
								type="text"
								inputMode="numeric"
								autoComplete="one-time-code"
								placeholder="Enter OTP code"
								maxLength={10}
							/>
						</Field>
						<Button
							type="button"
							className="w-full"
							disabled={loading}
							onClick={onSignInWithEmailOtp}
						>
							{loading && pendingAction === "email-otp-verify" ? (
								<Loader2 size={16} className="animate-spin" />
							) : (
								"Sign in with Email OTP"
							)}
						</Button>
					</>
				)}
			</div>
		</form>
	);
}
