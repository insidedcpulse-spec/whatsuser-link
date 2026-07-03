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
      className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-8"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">{t("usernameLabel")}</Label>
        <Input
          id="username"
          value={username}
          onChange={handleUsernameChange}
          placeholder={t("usernamePlaceholder")}
          maxLength={35}
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
        <Label htmlFor="usernameKey">{t("keyLabel")}</Label>
        <Input
          id="usernameKey"
          value={usernameKey}
          onChange={(event) => setUsernameKey(event.target.value)}
          placeholder={t("keyPlaceholder")}
          maxLength={8}
        />
        <p className="text-xs text-muted-foreground">{t("keyHint")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message">{t("messageLabel")}</Label>
        <Input
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("messagePlaceholder")}
        />
      </div>

      <Button type="submit" size="lg">
        {t("submit")}
      </Button>
    </form>
  );
}
