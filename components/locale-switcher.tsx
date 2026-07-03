"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center gap-1">
      {routing.locales.map((loc) => (
        <Button
          key={loc}
          variant={loc === locale ? "secondary" : "ghost"}
          size="sm"
          onClick={() => router.replace(pathname, { locale: loc })}
        >
          {loc.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
