import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (payload: {
  to: string;
  subject: string;
  text: string;
}) => {
  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_EMAIL_FROM || "onboarding@resend.dev",
      ...payload,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("Email sent successfully:", {
        id: response?.data?.id ?? null,
      });
    }

    if (response?.data) return true;
    return false;
  } catch (error: any) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error sending email:", error);
    }
    return false;
  }
};
