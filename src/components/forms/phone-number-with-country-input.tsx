"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DEFAULT_PHONE_COUNTRY_ISO2,
  PHONE_COUNTRIES,
} from "@/lib/phone-countries";
import { cn } from "@/lib/utils";

const PHONE_NUMBER_E164_REGEX = /^\+[1-9]\d{7,14}$/;

export const normalizePhoneLocalNumber = (value: string) =>
  value.replace(/[^\d]/g, "");

export const getPhoneCountryByIso2 = (countryIso2: string) =>
  PHONE_COUNTRIES.find((country) => country.iso2 === countryIso2);

export const defaultPhoneCountry =
  getPhoneCountryByIso2(DEFAULT_PHONE_COUNTRY_ISO2) ?? PHONE_COUNTRIES[0];

export const getE164PhoneNumber = (
  countryIso2: string,
  localPhoneNumber: string,
): string | null => {
  const selectedCountry = getPhoneCountryByIso2(countryIso2);
  if (!selectedCountry) return null;

  const normalizedLocalPhone = normalizePhoneLocalNumber(localPhoneNumber);
  if (!normalizedLocalPhone) return null;

  const phoneNumber = `${selectedCountry.dialCode}${normalizedLocalPhone}`;
  return PHONE_NUMBER_E164_REGEX.test(phoneNumber) ? phoneNumber : null;
};

interface PhoneNumberWithCountryInputProps {
  countryIso2: string;
  phoneNumber: string;
  onCountryIso2Change: (countryIso2: string) => void;
  onPhoneNumberChange: (phoneNumber: string) => void;
  countryId: string;
  phoneId: string;
  disabled?: boolean;
  countryAriaInvalid?: boolean;
  phoneAriaInvalid?: boolean;
  countryError?: ReactNode;
  phoneError?: ReactNode;
  countryLabel?: string;
  phoneLabel?: string;
}

export function PhoneNumberWithCountryInput({
  countryIso2,
  phoneNumber,
  onCountryIso2Change,
  onPhoneNumberChange,
  countryId,
  phoneId,
  disabled = false,
  countryAriaInvalid = false,
  phoneAriaInvalid = false,
  countryError,
  phoneError,
  countryLabel = "Country code",
  phoneLabel = "Phone number",
}: PhoneNumberWithCountryInputProps) {
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const selectedCountry =
    getPhoneCountryByIso2(countryIso2) ?? defaultPhoneCountry;

  return (
    <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
      <Field data-invalid={countryAriaInvalid}>
        <FieldLabel htmlFor={countryId}>{countryLabel}</FieldLabel>
        <Popover
          open={countryPickerOpen}
          onOpenChange={(open) => {
            if (disabled) return;
            setCountryPickerOpen(open);
          }}
        >
          <PopoverTrigger asChild>
            <Button
              id={countryId}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={countryPickerOpen}
              aria-invalid={countryAriaInvalid}
              disabled={disabled}
              className="w-full justify-between gap-2 font-normal"
            >
              <span className="flex min-w-0 items-center gap-2">
                {selectedCountry ? (
                  <Avatar className="h-4 w-6 rounded-[2px]">
                    <AvatarImage
                      src={selectedCountry.flagImageUrl}
                      alt={`${selectedCountry.name} flag`}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-[2px] text-[8px]">
                      {selectedCountry.iso2}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
                <span className="truncate">
                  {selectedCountry ? selectedCountry.name : "Select country"}
                </span>
              </span>
              {selectedCountry ? (
                <span className="ml-auto text-xs text-muted-foreground">
                  {selectedCountry.dialCode}
                </span>
              ) : null}
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Search country or dial code..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {PHONE_COUNTRIES.map((phoneCountry) => (
                    <CommandItem
                      key={phoneCountry.iso2}
                      value={`${phoneCountry.name} ${phoneCountry.dialCode} ${phoneCountry.iso2}`}
                      onSelect={() => {
                        if (disabled) return;
                        onCountryIso2Change(phoneCountry.iso2);
                        setCountryPickerOpen(false);
                      }}
                    >
                      <Avatar className="h-4 w-6 rounded-[2px]">
                        <AvatarImage
                          src={phoneCountry.flagImageUrl}
                          alt=""
                          aria-hidden
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-[2px] text-[8px]">
                          {phoneCountry.iso2}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{phoneCountry.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {phoneCountry.dialCode}
                      </span>
                      <Check
                        className={cn(
                          "size-4",
                          phoneCountry.iso2 === countryIso2
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {countryError}
      </Field>

      <Field data-invalid={phoneAriaInvalid}>
        <FieldLabel htmlFor={phoneId}>{phoneLabel}</FieldLabel>
        <Input
          id={phoneId}
          type="tel"
          placeholder="415 555 1234"
          inputMode="tel"
          aria-invalid={phoneAriaInvalid}
          autoComplete="tel-national"
          disabled={disabled}
          value={phoneNumber}
          onChange={(event) =>
            onPhoneNumberChange(event.target.value.replace(/[^\d()\s-]/g, ""))
          }
        />
        {phoneError}
      </Field>
    </div>
  );
}
