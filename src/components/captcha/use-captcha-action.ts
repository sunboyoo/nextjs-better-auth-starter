"use client";

import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { CaptchaFieldHandle } from "@/components/captcha/captcha-field";
import { isCaptchaEnabled } from "@/lib/captcha";

type NullableToken = string | null;
type GuardedToken = string | null | undefined;
type MissingCaptchaCallback = () => void;

const sleep = (ms: number) =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});

export function useCaptchaAction<TAction extends string>() {
	const captchaRef = useRef<CaptchaFieldHandle>(null);
	const [activeCaptchaAction, setActiveCaptchaAction] = useState<TAction | null>(
		null,
	);
	const captchaEnabled = isCaptchaEnabled();

	const waitForCaptchaRef = useCallback(async () => {
		const timeoutAt = Date.now() + 30_000;
		while (!captchaRef.current && Date.now() < timeoutAt) {
			await sleep(50);
		}
	}, []);

	const runCaptchaForAction = useCallback(
		async (action: TAction): Promise<NullableToken> => {
			if (!captchaEnabled) return null;

			flushSync(() => {
				setActiveCaptchaAction(action);
			});
			await waitForCaptchaRef();

			return (await captchaRef.current?.execute()) ?? null;
		},
		[captchaEnabled, waitForCaptchaRef],
	);

	const runCaptchaForActionOrFail = useCallback(
		async (
			action: TAction,
			onMissingCaptchaToken?: MissingCaptchaCallback,
		): Promise<GuardedToken> => {
			const token = await runCaptchaForAction(action);
			if (captchaEnabled && !token) {
				onMissingCaptchaToken?.();
				return undefined;
			}

			return token;
		},
		[captchaEnabled, runCaptchaForAction],
	);

	const resetCaptcha = useCallback(() => {
		setActiveCaptchaAction(null);
		captchaRef.current?.reset();
	}, []);

	const isCaptchaVisibleFor = useCallback(
		(action: TAction) => captchaEnabled && activeCaptchaAction === action,
		[activeCaptchaAction, captchaEnabled],
	);

	return {
		captchaEnabled,
		captchaRef,
		activeCaptchaAction,
		setActiveCaptchaAction,
		runCaptchaForAction,
		runCaptchaForActionOrFail,
		resetCaptcha,
		isCaptchaVisibleFor,
	};
}
