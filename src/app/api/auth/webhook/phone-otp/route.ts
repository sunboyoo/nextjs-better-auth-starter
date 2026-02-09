import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const phoneOtpPayloadSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Invalid E.164 phone number"),
  code: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, "Invalid OTP code"),
  type: z.enum(["verification", "password-reset"]),
});

const twilioResponseSchema = z.object({
  sid: z.string(),
  status: z.string().optional(),
  error_code: z.union([z.string(), z.number()]).optional().nullable(),
  error_message: z.string().optional().nullable(),
});

type ServiceMode = "twilio-live" | "twilio-test-fixed-otp";

const getServiceMode = (): ServiceMode => {
  const raw = process.env.BETTER_AUTH_PHONE_OTP_SERVICE_MODE?.trim().toLowerCase();
  if (raw === "twilio-test-fixed-otp") return "twilio-test-fixed-otp";
  return "twilio-live";
};

const getFixedTestCode = (): string => {
  const raw = process.env.BETTER_AUTH_PHONE_OTP_FIXED_TEST_CODE?.trim() || "000000";
  return /^\d{4,10}$/.test(raw) ? raw : "000000";
};

const getBearerTokenFromHeader = (
  authorization: string | null,
): string | null => {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token.trim();
};

const secureEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

const maskPhoneNumber = (phoneNumber: string) => {
  if (phoneNumber.length <= 6) return phoneNumber;
  return `${phoneNumber.slice(0, 3)}***${phoneNumber.slice(-3)}`;
};

const buildOtpMessage = ({
  otpCode,
  type,
}: {
  otpCode: string;
  type: "verification" | "password-reset";
}) => {
  if (type === "password-reset") {
    return `Your password reset code is: ${otpCode}`;
  }
  return `Your verification code is: ${otpCode}`;
};

const jsonError = ({
  status,
  requestId,
  code,
  message,
  details,
}: {
  status: number;
  requestId: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}) =>
  NextResponse.json(
    {
      ok: false,
      requestId,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status },
  );

const parseTwilioResponse = (raw: string): unknown => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
};

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id")?.trim() || randomUUID();

  const expectedToken =
    process.env.BETTER_AUTH_PHONE_OTP_WEBHOOK_AUTH_TOKEN?.trim() || "";
  if (!expectedToken) {
    return jsonError({
      status: 500,
      requestId,
      code: "CONFIG_MISSING_WEBHOOK_TOKEN",
      message:
        "Server misconfigured: BETTER_AUTH_PHONE_OTP_WEBHOOK_AUTH_TOKEN is missing.",
    });
  }

  const providedToken = getBearerTokenFromHeader(
    request.headers.get("authorization"),
  );
  if (!providedToken || !secureEqual(providedToken, expectedToken)) {
    console.warn("[phone-otp-service] unauthorized request", {
      requestId,
    });
    return jsonError({
      status: 401,
      requestId,
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  let parsedPayload: ReturnType<typeof phoneOtpPayloadSchema.safeParse>;
  try {
    const json = await request.json();
    parsedPayload = phoneOtpPayloadSchema.safeParse(json);
  } catch {
    return jsonError({
      status: 400,
      requestId,
      code: "INVALID_JSON",
      message: "Invalid JSON body",
    });
  }

  if (!parsedPayload.success) {
    return jsonError({
      status: 400,
      requestId,
      code: "INVALID_PAYLOAD",
      message: "Invalid request body",
      details: {
        issues: parsedPayload.error.issues.map((issue) => issue.message),
      },
    });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() || "";
  const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim() || "";

  if (!accountSid || !authToken || !fromPhoneNumber) {
    return jsonError({
      status: 500,
      requestId,
      code: "CONFIG_MISSING_TWILIO_CREDENTIALS",
      message:
        "Server misconfigured: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are required.",
    });
  }

  const serviceMode = getServiceMode();
  const fixedTestCode = getFixedTestCode();
  const payload = parsedPayload.data;
  const effectiveCode =
    serviceMode === "twilio-test-fixed-otp" ? fixedTestCode : payload.code;
  const maskedPhoneNumber = maskPhoneNumber(payload.phoneNumber);
  const body = new URLSearchParams({
    To: payload.phoneNumber,
    From: fromPhoneNumber,
    Body: buildOtpMessage({
      otpCode: effectiveCode,
      type: payload.type,
    }),
  });
  const basicAuthCredentials = Buffer.from(
    `${accountSid}:${authToken}`,
  ).toString("base64");

  console.info("[phone-otp-service] accepted webhook", {
    requestId,
    provider: "twilio",
    mode: serviceMode,
    type: payload.type,
    phoneNumber: maskedPhoneNumber,
    codeStrategy:
      serviceMode === "twilio-test-fixed-otp"
        ? "fixed-test-code"
        : "passthrough",
  });

  try {
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuthCredentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );
    const twilioRaw = await twilioResponse.text();
    const twilioJson = parseTwilioResponse(twilioRaw);
    const parsedTwilioResponse = twilioResponseSchema.safeParse(twilioJson);

    if (!twilioResponse.ok) {
      const errorMessage =
        parsedTwilioResponse.success &&
        typeof parsedTwilioResponse.data.error_message === "string"
          ? parsedTwilioResponse.data.error_message
          : "Twilio request failed";
      const errorCode = parsedTwilioResponse.success
        ? parsedTwilioResponse.data.error_code
        : null;

      console.error("[phone-otp-service] provider delivery failed", {
        requestId,
        provider: "twilio",
        mode: serviceMode,
        status: twilioResponse.status,
        type: payload.type,
        phoneNumber: maskedPhoneNumber,
        providerErrorCode: errorCode,
      });

      return jsonError({
        status: 502,
        requestId,
        code: "PROVIDER_DELIVERY_FAILED",
        message: errorMessage,
        details: {
          provider: "twilio",
          providerStatus: twilioResponse.status,
          providerErrorCode: errorCode,
        },
      });
    }

    const providerMessageId = parsedTwilioResponse.success
      ? parsedTwilioResponse.data.sid
      : undefined;
    const providerStatus = parsedTwilioResponse.success
      ? parsedTwilioResponse.data.status
      : undefined;

    console.info("[phone-otp-service] provider delivery succeeded", {
      requestId,
      provider: "twilio",
      mode: serviceMode,
      type: payload.type,
      phoneNumber: maskedPhoneNumber,
      messageSid: providerMessageId,
      providerStatus,
    });

    return NextResponse.json({
      ok: true,
      requestId,
      provider: "twilio",
      mode: serviceMode,
      delivery: {
        accepted: true,
        providerMessageId,
        providerStatus,
      },
      otp: {
        type: payload.type,
        codeStrategy:
          serviceMode === "twilio-test-fixed-otp"
            ? "fixed-test-code"
            : "passthrough",
      },
    });
  } catch (error) {
    console.error("[phone-otp-service] provider request error", {
      requestId,
      provider: "twilio",
      mode: serviceMode,
      type: payload.type,
      phoneNumber: maskedPhoneNumber,
      error,
    });
    return jsonError({
      status: 502,
      requestId,
      code: "PROVIDER_REQUEST_ERROR",
      message: "Failed to send OTP SMS",
      details: {
        provider: "twilio",
      },
    });
  }
}
