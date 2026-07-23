"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkResult } from "@/components/whatsapp/link-result";
import { createWhatsAppLink } from "@/services/link-service";
import { sanitizeUsernameInput } from "@/utils/validate-username";
import type { GeneratedLink } from "@/types/whatsapp";

export function UsernameGenerator() {
  const t = useTranslations("form");
  const tErrors = useTranslations("errors");
  const tKeyErrors = useTranslations("keyErrors");

  const [username, setUsername] = useState("");
  const [usernameKey, setUsernameKey] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [link, setLink] = useState<GeneratedLink | null>(null);

  function handleUsernameChange(event: ChangeEvent<HTMLInputElement>) {
    setUsername(sanitizeUsernameInput(event.target.value));
  }

  function translateError(key: string): string {
    if (key.startsWith("errors.")) {
      return tErrors(key.replace("errors.", ""));
    }
    return tKeyErrors(key.replace("keyErrors.", ""));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = createWhatsAppLink(username, usernameKey, message);

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
    setUsername("");
    setUsernameKey("");
    setMessage("");
    setErrors([]);
  }

  if (link) {
    return <LinkResult link={link} onReset={handleReset} />;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 sm:p-6 md:p-8 shadow-sm w-full max-w-full overflow-hidden"
    >
      <h2 className="text-center text-base sm:text-lg font-semibold text-foreground border-b pb-3 mb-1">
        {t("sectionTitle")}
      </h2>

      <div className="flex flex-col gap-2 w-full min-w-0">
        <Label htmlFor="username">{t("usernameLabel")}</Label>
        <Input
          id="username"
          value={username}
          onChange={handleUsernameChange}
          placeholder={t("usernamePlaceholder")}
          maxLength={35}
          className="h-10 text-base sm:text-sm w-full"
        />
        {errors.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-destructive">
            {errors.map((error) => (
              <li key={error}>{translateError(error)}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 w-full min-w-0">
        <Label htmlFor="usernameKey">{t("keyLabel")}</Label>
        <Input
          id="usernameKey"
          value={usernameKey}
          onChange={(event) => setUsernameKey(event.target.value)}
          placeholder={t("keyPlaceholder")}
          maxLength={8}
          className="h-10 text-base sm:text-sm w-full"
        />
        <p className="text-xs text-muted-foreground leading-relaxed">{t("keyHint")}</p>
      </div>

      <div className="flex flex-col gap-2 w-full min-w-0">
        <Label htmlFor="message">{t("messageLabel")}</Label>
        <Input
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("messagePlaceholder")}
          className="h-10 text-base sm:text-sm w-full"
        />
      </div>

      <Button type="submit" size="lg" className="w-full h-11 text-sm font-semibold mt-1">
        {t("submit")}
      </Button>
    </form>
  );
}
