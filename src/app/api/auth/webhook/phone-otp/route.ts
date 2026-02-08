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

const buildOtpMessage = (payload: z.infer<typeof phoneOtpPayloadSchema>) => {
  if (payload.type === "password-reset") {
    return `Your password reset code is: ${payload.code}`;
  }
  return `Your verification code is: ${payload.code}`;
};

const maskPhoneNumber = (phoneNumber: string) => {
  if (phoneNumber.length <= 6) return phoneNumber;
  return `${phoneNumber.slice(0, 3)}***${phoneNumber.slice(-3)}`;
};

const getBearerTokenFromHeader = (
  authorization: string | null,
): string | null => {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token.trim();
};

export async function POST(request: Request) {
  const expectedToken =
    process.env.BETTER_AUTH_PHONE_OTP_WEBHOOK_AUTH_TOKEN?.trim() || "";
  if (!expectedToken) {
    return NextResponse.json(
      {
        error:
          "Server misconfigured: BETTER_AUTH_PHONE_OTP_WEBHOOK_AUTH_TOKEN is missing.",
      },
      { status: 500 },
    );
  }

  const providedToken = getBearerTokenFromHeader(
    request.headers.get("authorization"),
  );
  if (!providedToken || providedToken !== expectedToken) {
    console.warn("[phone-otp-webhook] unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsedPayload: ReturnType<typeof phoneOtpPayloadSchema.safeParse>;
  try {
    const json = await request.json();
    parsedPayload = phoneOtpPayloadSchema.safeParse(json);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        issues: parsedPayload.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() || "";
  const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim() || "";

  if (!accountSid || !authToken || !fromPhoneNumber) {
    return NextResponse.json(
      {
        error:
          "Server misconfigured: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are required.",
      },
      { status: 500 },
    );
  }

  const payload = parsedPayload.data;
  const maskedPhoneNumber = maskPhoneNumber(payload.phoneNumber);
  const body = new URLSearchParams({
    To: payload.phoneNumber,
    From: fromPhoneNumber,
    Body: buildOtpMessage(payload),
  });

  const basicAuthCredentials = Buffer.from(
    `${accountSid}:${authToken}`,
  ).toString("base64");

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
    const twilioJson = twilioRaw ? JSON.parse(twilioRaw) : null;
    const parsedTwilioResponse = twilioResponseSchema.safeParse(twilioJson);

    if (!twilioResponse.ok) {
      const errorMessage =
        parsedTwilioResponse.success &&
        typeof parsedTwilioResponse.data.error_message === "string"
          ? parsedTwilioResponse.data.error_message
          : "Twilio request failed";

      console.error("[phone-otp-webhook] twilio delivery failed", {
        status: twilioResponse.status,
        type: payload.type,
        phoneNumber: maskedPhoneNumber,
      });
      return NextResponse.json(
        {
          error: errorMessage,
        },
        { status: 502 },
      );
    }

    console.info("[phone-otp-webhook] otp delivered", {
      messageSid: parsedTwilioResponse.success
        ? parsedTwilioResponse.data.sid
        : undefined,
      type: payload.type,
      phoneNumber: maskedPhoneNumber,
    });

    return NextResponse.json({
      status: true,
      messageSid: parsedTwilioResponse.success
        ? parsedTwilioResponse.data.sid
        : undefined,
    });
  } catch (error) {
    console.error("[phone-otp-webhook] failed to send SMS", error);
    return NextResponse.json(
      {
        error: "Failed to send OTP SMS",
      },
      { status: 502 },
    );
  }
}
