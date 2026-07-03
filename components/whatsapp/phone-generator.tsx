"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneLinkResult } from "@/components/whatsapp/phone-link-result";
import { createPhoneWhatsAppLink } from "@/services/phone-link-service";
import { sanitizePhoneInput } from "@/utils/validate-phone";
import { COUNTRY_CODES } from "@/lib/countryCodes";
import type { GeneratedPhoneLink } from "@/types/whatsapp";

const MAX_COMBINED_DIGITS = 15;

export function PhoneGenerator() {
  const t = useTranslations("phone");
  const tForm = useTranslations("form");
  const tPhoneErrors = useTranslations("phoneErrors");

  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].code);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [link, setLink] = useState<GeneratedPhoneLink | null>(null);

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) ?? COUNTRY_CODES[0];
  const maxPhoneLength = MAX_COMBINED_DIGITS - selectedCountry.dialCode.length;

  function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
    setPhone(sanitizePhoneInput(event.target.value));
  }

  function translateError(key: string): string {
    return tPhoneErrors(key.replace("phoneErrors.", ""));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = createPhoneWhatsAppLink(`${selectedCountry.dialCode}${phone}`, message);

    if (!result.success) {
      setErrors(result.errors);
      setLink(null);
      return;
    }

    setErrors([]);
    setLink(result.link);
  }

  function handleReset() {
    setLink(null);
    setPhone("");
    setMessage("");
    setErrors([]);
  }

  if (link) {
    return <PhoneLinkResult link={link} onReset={handleReset} />;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-8"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="country">{t("countryLabel")}</Label>
        <Select
          value={countryCode}
          onValueChange={(value) => value && setCountryCode(value)}
        >
          <SelectTrigger id="country" className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.name} (+{country.dialCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">{t("phoneLabel")}</Label>
        <Input
          id="phone"
          value={phone}
          onChange={handlePhoneChange}
          placeholder={t("phonePlaceholder")}
          maxLength={maxPhoneLength}
        />
        {errors.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-destructive">
            {errors.map((error) => (
              <li key={error}>{translateError(error)}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone-message">{tForm("messageLabel")}</Label>
        <Input
          id="phone-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={tForm("messagePlaceholder")}
        />
      </div>

      <Button type="submit" size="lg">
        {t("submit")}
      </Button>
    </form>
  );
}
