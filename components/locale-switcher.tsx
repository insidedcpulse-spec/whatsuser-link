"use client";

import { useLocale } from "next-intl";
import { usePathname, getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1">
      {routing.locales.map((loc) => (
        <Button
          key={loc}
          variant={loc === locale ? "secondary" : "ghost"}
          size="sm"
          onClick={() => {
            // Full page navigation, not router.replace: the root layout lives
            // under [locale], so a client-side locale switch remounts the
            // html/head tree and can drop the stylesheet <link> (page renders
            // unstyled). A hard navigation always gets a fresh, fully-styled
            // document.
            window.location.href = getPathname({ href: pathname, locale: loc });
          }}
        >
          {loc.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
