"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { CaptchaActionSlot } from "@/components/captcha/captcha-action-slot";
import { useCaptchaAction } from "@/components/captcha/use-captcha-action";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
	CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE,
	getCaptchaHeaders,
} from "@/lib/captcha";

const forgetPasswordSchema = z.object({
	email: z.email("Please enter a valid email address."),
});

type ForgetPasswordFormValues = z.infer<typeof forgetPasswordSchema>;
type CaptchaAction = "send-reset-link";

interface ForgetPasswordFormProps {
	onSuccess?: () => void;
	onError?: (error: string) => void;
	redirectTo?: string;
}

export function ForgetPasswordForm({
	onSuccess,
	onError,
	redirectTo = "/auth/reset-password",
}: ForgetPasswordFormProps) {
	const [loading, startTransition] = useTransition();
	const {
		captchaRef,
		runCaptchaForActionOrFail,
		resetCaptcha,
		isCaptchaVisibleFor,
	} =
		useCaptchaAction<CaptchaAction>();

	const form = useForm<ForgetPasswordFormValues>({
		resolver: zodResolver(forgetPasswordSchema),
		defaultValues: {
			email: "",
		},
	});

	const onSubmit = (data: ForgetPasswordFormValues) => {
		startTransition(async () => {
			try {
				const captchaToken = await runCaptchaForActionOrFail(
					"send-reset-link",
					() => {
						onError?.(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
						toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
					},
				);
				if (captchaToken === undefined) return;

				const result = await authClient.requestPasswordReset({
					email: data.email,
					redirectTo,
					fetchOptions: {
						headers: getCaptchaHeaders(captchaToken),
					},
				});
				if (result.error) {
					throw new Error(result.error.message || "Unable to send reset email.");
				}
				onSuccess?.();
			} catch {
				onError?.("An error occurred. Please try again.");
			} finally {
				resetCaptcha();
			}
		});
	};

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
			<FieldGroup>
				<Controller
					name="email"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="forget-email">Email</FieldLabel>
							<Input
								{...field}
								id="forget-email"
								type="email"
								placeholder="Enter my email"
								aria-invalid={fieldState.invalid}
								autoComplete="email"
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
			</FieldGroup>
			<Button type="submit" className="w-full" disabled={loading}>
				{loading ? (
					<Loader2 size={16} className="animate-spin" />
				) : (
					"Send reset link"
				)}
			</Button>
			<CaptchaActionSlot
				show={isCaptchaVisibleFor("send-reset-link")}
				captchaRef={captchaRef}
			/>
		</form>
	);
}
