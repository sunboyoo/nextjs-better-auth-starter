"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const backupCodeSchema = z.object({
  code: z.string().trim().min(1, "Backup code is required."),
});

type BackupCodeFormValues = z.infer<typeof backupCodeSchema>;

interface TwoFactorBackupCodeFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function TwoFactorBackupCodeForm({
  onSuccess,
  onError,
}: TwoFactorBackupCodeFormProps) {
  const [loading, startTransition] = useTransition();
  const [isVerified, setIsVerified] = useState(false);

  const form = useForm<BackupCodeFormValues>({
    resolver: zodResolver(backupCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const onSubmit = (data: BackupCodeFormValues) => {
    startTransition(async () => {
      const res = await authClient.twoFactor.verifyBackupCode({
        code: data.code.trim(),
      });

      if (res.data?.token) {
        setIsVerified(true);
        onSuccess?.();
        return;
      }

      onError?.("Invalid backup code");
      form.setError("code", { message: "Invalid backup code" });
    });
  };

  if (isVerified) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-6">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
        <p className="text-lg font-semibold">Verification Successful</p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
      <FieldGroup>
        <Controller
          name="code"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="backup-code">Backup Code</FieldLabel>
              <Input
                {...field}
                id="backup-code"
                type="text"
                placeholder="Enter backup code"
                aria-invalid={fieldState.invalid}
                autoCapitalize="none"
                autoComplete="one-time-code"
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
      </FieldGroup>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 size={16} className="animate-spin" /> : "Verify"}
      </Button>
    </form>
  );
}
