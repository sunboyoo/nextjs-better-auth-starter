"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import type { ClientAuthenticationProfile } from "@/config/authentication/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PhoneNumberWithCountryInput,
  defaultPhoneCountry,
  getE164PhoneNumber,
} from "@/components/forms/phone-number-with-country-input";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildAuthPageUrl,
  normalizeIdentifierValue,
  shouldUseDedicatedBiometricPage,
  shouldShowSocialForStep,
} from "@/lib/authentication-profile-flow";
import { getCallbackURL } from "@/lib/better-auth-official/shared";
import { SocialSignInButtons } from "./social-sign-in-buttons";

type IdentifierTab = "email" | "phone" | "username";

interface SignInIdentifyStepProps {
  profile: ClientAuthenticationProfile;
  params: ReadonlyURLSearchParams;
}

const FIELD_COPY: Record<IdentifierTab, { label: string; placeholder: string; type: string }> = {
  email: {
    label: "Email",
    placeholder: "m@example.com",
    type: "email",
  },
  phone: {
    label: "Phone Number",
    placeholder: "+1 555 555 5555",
    type: "tel",
  },
  username: {
    label: "Username",
    placeholder: "your.username",
    type: "text",
  },
};

export function SignInIdentifyStep({ profile, params }: SignInIdentifyStepProps) {
  const router = useRouter();
  const callbackURL = getCallbackURL(params);
  const supportedIdentifiers = profile.identify.identifiers as readonly IdentifierTab[];
  const initialIdentifier =
    supportedIdentifiers.includes(profile.identify.primaryIdentifier as IdentifierTab)
      ? (profile.identify.primaryIdentifier as IdentifierTab)
      : supportedIdentifiers[0];
  const [identifierType, setIdentifierType] =
    useState<IdentifierTab>(initialIdentifier);
  const [identifierValue, setIdentifierValue] = useState("");
  const [phoneCountryIso2, setPhoneCountryIso2] = useState(
    defaultPhoneCountry.iso2,
  );
  const [phoneLocalNumber, setPhoneLocalNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fieldCopy = useMemo(
    () => FIELD_COPY[identifierType],
    [identifierType],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let normalizedIdentifier: string;

    if (identifierType === "phone") {
      const e164 = getE164PhoneNumber(phoneCountryIso2, phoneLocalNumber);
      if (!e164) {
        setErrorMessage("Enter a valid phone number to continue.");
        return;
      }
      normalizedIdentifier = e164;
    } else {
      normalizedIdentifier = normalizeIdentifierValue(
        identifierType,
        identifierValue,
      );
      if (!normalizedIdentifier) {
        setErrorMessage(`Enter your ${fieldCopy.label.toLowerCase()} to continue.`);
        return;
      }
    }

    setErrorMessage(null);

    const destination =
      shouldUseDedicatedBiometricPage(profile) && profile.pages.biometric
        ? profile.pages.biometric
        : profile.pages.method;

    const href = buildAuthPageUrl(destination, {
      callbackUrl: callbackURL,
      identifierType,
      identifier: normalizedIdentifier,
    });

    router.push(href);
  };

  const showStep1Social = shouldShowSocialForStep(profile, "step1");

  return (
    <Card className="w-full rounded-none max-h-[90vh] overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Enter your identifier to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-6" onSubmit={onSubmit}>
          <Tabs
            value={identifierType}
            onValueChange={(value) => {
              setIdentifierType(value as IdentifierTab);
              setIdentifierValue("");
              setPhoneLocalNumber("");
              setErrorMessage(null);
            }}
            className="w-full"
          >
            {supportedIdentifiers.length > 1 && (
              <TabsList
                className="grid w-full"
                style={{
                  gridTemplateColumns: `repeat(${supportedIdentifiers.length}, minmax(0, 1fr))`,
                }}
              >
                {supportedIdentifiers.map((identifier) => (
                  <TabsTrigger key={identifier} value={identifier}>
                    {FIELD_COPY[identifier].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            )}

            {supportedIdentifiers.map((identifier) => (
              <TabsContent key={identifier} value={identifier} className="mt-6">
                {identifier === "phone" ? (
                  <PhoneNumberWithCountryInput
                    countryIso2={phoneCountryIso2}
                    phoneNumber={phoneLocalNumber}
                    onCountryIso2Change={setPhoneCountryIso2}
                    onPhoneNumberChange={setPhoneLocalNumber}
                    countryId="identify-phone-country"
                    phoneId="identify-phone"
                  />
                ) : (
                  <>
                    <label
                      htmlFor={`identify-${identifier}`}
                      className="text-sm font-medium leading-none"
                    >
                      {FIELD_COPY[identifier].label}
                    </label>
                    <Input
                      id={`identify-${identifier}`}
                      type={FIELD_COPY[identifier].type}
                      value={identifierType === identifier ? identifierValue : ""}
                      onChange={(event) => setIdentifierValue(event.target.value)}
                      placeholder={FIELD_COPY[identifier].placeholder}
                      className="mt-2"
                      autoCapitalize="none"
                      autoComplete={
                        identifier === "email" ? "email" : "username"
                      }
                    />
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}

          <Button type="submit">Continue</Button>

          <p className="text-xs text-muted-foreground">
            {profile.identify.antiEnumeration.genericSuccessMessage}
          </p>
        </form>

        {showStep1Social && (
          <>
            <div className="relative py-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  OR CONTINUE WITH SOCIAL
                </span>
              </div>
            </div>
            <SocialSignInButtons callbackURL={callbackURL} params={params} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
