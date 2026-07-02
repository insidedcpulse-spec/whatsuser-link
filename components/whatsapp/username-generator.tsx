"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkResult } from "@/components/whatsapp/link-result";
import { createWhatsAppLink } from "@/services/link-service";
import { sanitizeUsernameInput } from "@/utils/validate-username";
import type { GeneratedLink } from "@/types/whatsapp";

export function UsernameGenerator() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [link, setLink] = useState<GeneratedLink | null>(null);

  function handleUsernameChange(event: ChangeEvent<HTMLInputElement>) {
    setUsername(sanitizeUsernameInput(event.target.value));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = createWhatsAppLink(username, message);

    if (!result.success) {
      setErrors(result.validation.errors);
      setLink(null);
      return;
    }

    setErrors([]);
    setLink(result.link);
  }

  function handleReset() {
    setLink(null);
    setUsername("");
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
        <Label htmlFor="username">WhatsApp Username</Label>
        <Input
          id="username"
          value={username}
          onChange={handleUsernameChange}
          placeholder="@username"
          maxLength={35}
        />
        {errors.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-destructive">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message">Mensagem (opcional)</Label>
        <Input
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Olá! Gostava de falar contigo."
        />
      </div>

      <Button type="submit" size="lg">
        Generate Link
      </Button>
    </form>
  );
}
