"use client";

import { useLocale } from "next-intl";
import { usePathname, getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      {routing.locales.map((loc) => (
        <Button
          key={loc}
          variant={loc === locale ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-1.5 text-[11px] font-semibold sm:h-8 sm:px-2.5 sm:text-xs rounded-md"
          onClick={() => {
            // Persist choice in cookie
            document.cookie = `NEXT_LOCALE=${loc};path=/;max-age=31536000`;
            window.location.href = getPathname({ href: pathname, locale: loc });
          }}
        >
          {loc.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
