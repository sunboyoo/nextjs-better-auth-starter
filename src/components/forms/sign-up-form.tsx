"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import Image from "next/image";
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
import { useImagePreview } from "@/hooks/use-image-preview";
import { authClient } from "@/lib/auth-client";
import {
	CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE,
	getCaptchaHeaders,
} from "@/lib/captcha";
import { convertImageToBase64 } from "@/lib/utils";

const usernameSchema = z
	.string()
	.trim()
	.min(3, "Username must be at least 3 characters.")
	.max(30, "Username must be at most 30 characters.")
	.regex(
		/^[a-zA-Z0-9_.]+$/,
		"Username can only include letters, numbers, underscores, and dots.",
	);

const signUpSchema = z
	.object({
		firstName: z.string().min(1, "First name is required."),
		lastName: z.string().min(1, "Last name is required."),
		email: z.string().email("Please enter a valid email address."),
		username: usernameSchema.optional().or(z.literal("")),
		password: z.string().min(8, "Password must be at least 8 characters."),
		passwordConfirmation: z.string().min(1, "Please confirm my password."),
	})
	.refine((data) => data.password === data.passwordConfirmation, {
		message: "Passwords do not match.",
		path: ["passwordConfirmation"],
	});

type SignUpFormValues = z.infer<typeof signUpSchema>;
type CaptchaAction = "sign-up";

interface SignUpFormProps {
	onSuccess?: () => void;
	callbackURL?: string;
	params?: URLSearchParams;
}

export function SignUpForm({
	onSuccess,
	callbackURL = "/dashboard",
	params,
}: SignUpFormProps) {
	const [loading, startTransition] = useTransition();
	const {
		captchaRef,
		runCaptchaForActionOrFail,
		resetCaptcha,
		isCaptchaVisibleFor,
	} = useCaptchaAction<CaptchaAction>();
	const { image, imagePreview, handleImageChange, clearImage } =
		useImagePreview();

	const form = useForm<SignUpFormValues>({
		resolver: zodResolver(signUpSchema),
		defaultValues: {
			firstName: "",
			lastName: "",
			email: "",
			username: "",
			password: "",
			passwordConfirmation: "",
		},
	});

	const onSubmit = (data: SignUpFormValues) => {
		startTransition(async () => {
			try {
				const captchaToken = await runCaptchaForActionOrFail("sign-up", () => {
					toast.error(CAPTCHA_VERIFICATION_INCOMPLETE_MESSAGE);
				});
				if (captchaToken === undefined) return;
				const username = data.username?.trim();

				await authClient.signUp.email({
					email: data.email,
					password: data.password,
					name: `${data.firstName} ${data.lastName}`,
					username: username ? username : undefined,
					image: image ? await convertImageToBase64(image) : "",
					callbackURL,
					fetchOptions: {
						query: params ? Object.fromEntries(params.entries()) : undefined,
						headers: getCaptchaHeaders(captchaToken),
						onError: (ctx) => {
							toast.error(ctx.error.message);
						},
						onSuccess: async () => {
							toast.success(
								"Account created. Check your email to verify your account before signing in.",
							);
							onSuccess?.();
						},
					},
				});
			} finally {
				resetCaptcha();
			}
		});
	};

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-2">
			<FieldGroup>
				<div className="grid grid-cols-2 gap-4">
					<Controller
						name="firstName"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor="sign-up-first-name">First name</FieldLabel>
								<Input
									{...field}
									id="sign-up-first-name"
									placeholder="Max"
									aria-invalid={fieldState.invalid}
									autoComplete="given-name"
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>
					<Controller
						name="lastName"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor="sign-up-last-name">Last name</FieldLabel>
								<Input
									{...field}
									id="sign-up-last-name"
									placeholder="Robinson"
									aria-invalid={fieldState.invalid}
									autoComplete="family-name"
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>
					</div>
					<Controller
						name="email"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
								<Input
									{...field}
									id="sign-up-email"
									type="email"
									placeholder="m@example.com"
									aria-invalid={fieldState.invalid}
									autoComplete="email"
								/>
								{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
							</Field>
						)}
					/>
					<Controller
						name="username"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor="sign-up-username">
									Username (optional)
								</FieldLabel>
								<Input
									{...field}
									id="sign-up-username"
									type="text"
									placeholder="your.username"
									aria-invalid={fieldState.invalid}
									autoCapitalize="none"
									autoComplete="username"
								/>
								{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
							</Field>
						)}
					/>
					<div className="grid grid-cols-2 gap-4">
						<Controller
							name="password"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
									<Input
										{...field}
										id="sign-up-password"
										type="password"
										placeholder="Password"
										aria-invalid={fieldState.invalid}
										autoComplete="new-password"
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
						<Controller
							name="passwordConfirmation"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="sign-up-password-confirmation">
										Confirm Password
									</FieldLabel>
									<Input
										{...field}
										id="sign-up-password-confirmation"
										type="password"
										placeholder="Confirm Password"
										aria-invalid={fieldState.invalid}
										autoComplete="new-password"
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
					</div>
				<Field>
					<FieldLabel htmlFor="sign-up-image">
						Profile Image (optional)
					</FieldLabel>
					<div className="flex items-end gap-4">
						{imagePreview && (
							<div className="relative w-16 h-16 rounded-sm overflow-hidden">
								<Image
									src={imagePreview}
									alt="Profile preview"
									width={64}
									height={64}
									className="object-cover w-full h-full"
									unoptimized
								/>
							</div>
						)}
						<div className="flex items-center gap-2 w-full">
							<Input
								id="sign-up-image"
								type="file"
								accept="image/*"
								onChange={handleImageChange}
								className="w-full"
							/>
							{imagePreview && (
								<X className="cursor-pointer" onClick={clearImage} />
							)}
						</div>
					</div>
				</Field>
			</FieldGroup>
			<Button type="submit" className="w-full" disabled={loading}>
				{loading ? (
					<Loader2 size={16} className="animate-spin" />
				) : (
					"Create an account"
				)}
			</Button>
			<CaptchaActionSlot
				show={isCaptchaVisibleFor("sign-up")}
				captchaRef={captchaRef}
			/>
		</form>
	);
}
