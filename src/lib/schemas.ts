import { z } from "zod";

export const changeEmailSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

export type ChangeEmailSchema = z.infer<typeof changeEmailSchema>;
