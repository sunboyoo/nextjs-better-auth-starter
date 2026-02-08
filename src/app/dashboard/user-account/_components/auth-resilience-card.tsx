import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ShieldCheck } from "lucide-react";

interface AuthResilienceCardProps {
  hasVerifiedEmailChannel: boolean;
  hasVerifiedPhoneChannel: boolean;
  hasPasskey: boolean;
  hasPassword: boolean;
  primaryAuthChannel?: string | null;
}

export function AuthResilienceCard({
  hasVerifiedEmailChannel,
  hasVerifiedPhoneChannel,
  hasPasskey,
  hasPassword,
  primaryAuthChannel,
}: AuthResilienceCardProps) {
  const missingActions: string[] = [];

  if (!hasVerifiedEmailChannel) {
    missingActions.push("Add and verify a real email for backup recovery.");
  }

  if (!hasVerifiedPhoneChannel) {
    missingActions.push("Add and verify a phone number for OTP recovery.");
  }

  if (!hasPasskey) {
    missingActions.push("Add a passkey to protect against SIM-swap and mailbox loss.");
  }

  if (!hasPassword) {
    missingActions.push("Set a password to support high-assurance re-auth flows.");
  }

  const isResilient = missingActions.length === 0;
  const channelSummary =
    primaryAuthChannel === "mixed"
      ? "Using both email and phone channels."
      : primaryAuthChannel === "phone"
        ? "Phone-first channel detected."
        : "Email-first channel detected.";

  return (
    <Card className="overflow-hidden py-0 gap-0 border-0 shadow-none">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              isResilient
                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            }`}
          >
            {isResilient ? (
              <ShieldCheck className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold">Account Resilience</h2>
              <Badge variant={isResilient ? "default" : "secondary"}>
                {isResilient ? "Strong" : "Needs attention"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{channelSummary}</p>

            {isResilient ? (
              <p className="text-sm text-muted-foreground">
                Your account has strong recovery coverage across channels and
                authentication factors.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Complete the following to reduce lockout risk:
                </p>
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                  {missingActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
                <p className="text-xs">
                  Review settings in{" "}
                  <Link href="/dashboard/user-account" className="underline">
                    this page
                  </Link>{" "}
                  under Email, Phone, Password, and Passkey sections.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
