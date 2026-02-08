"use client";

import type { RefObject } from "react";
import {
	CaptchaField,
	type CaptchaFieldHandle,
} from "@/components/captcha/captcha-field";

interface CaptchaActionSlotProps {
	show: boolean;
	captchaRef: RefObject<CaptchaFieldHandle | null>;
	className?: string;
}

export function CaptchaActionSlot({
	show,
	captchaRef,
	className,
}: CaptchaActionSlotProps) {
	if (!show) return null;

	return (
		<div className={className}>
			<CaptchaField ref={captchaRef} />
		</div>
	);
}

