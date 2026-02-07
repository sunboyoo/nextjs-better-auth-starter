import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const sendEmail = async (payload: {
  to: string;
  subject: string;
  text: string;
}) => {
  if (!resend) {
    throw new Error("Email service is not configured (RESEND_API_KEY is missing).");
  }

  const response = await resend.emails.send({
    from: process.env.RESEND_EMAIL_FROM || "onboarding@resend.dev",
    ...payload,
  });

  if (response?.error) {
    throw new Error(response.error.message || "Email delivery failed.");
  }

  if (!response?.data?.id) {
    throw new Error("Email provider did not return a message id.");
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("Email sent successfully:", {
      id: response.data.id,
    });
  }
};
