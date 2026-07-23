"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const t = useTranslations("common");
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg flex items-center justify-center text-foreground hover:bg-accent transition-colors"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={t("themeToggleLabel")}
    >
      <Sun className="h-4 w-4 sm:h-4.5 sm:w-4.5 dark:hidden" />
      <Moon className="hidden h-4 w-4 sm:h-4.5 sm:w-4.5 dark:block" />
    </Button>
  );
}
