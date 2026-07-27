"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Copy, Check, ArrowRight, Lightbulb } from "lucide-react";
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
import { sanitizeUsernameInput, validateUsername } from "@/utils/validate-username";

type StyleCategory = "aesthetic" | "business" | "minimal" | "creative";

export function UsernameIdeaGenerator({
  onSelectUsername,
}: {
  onSelectUsername?: (username: string) => void;
}) {
  const t = useTranslations("ideaGenerator");

  const [inputName, setInputName] = useState("");
  const [style, setStyle] = useState<StyleCategory>("aesthetic");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  function generateIdeas() {
    const raw = sanitizeUsernameInput(inputName) || "user";

    const patterns: Record<StyleCategory, string[]> = {
      aesthetic: [
        `its.${raw}`,
        `vibe.${raw}`,
        `${raw}.aesthetic`,
        `the.${raw}.co`,
        `${raw}.studio`,
        `real.${raw}`,
        `${raw}.mode`,
      ],
      business: [
        `${raw}.official`,
        `${raw}.business`,
        `get.${raw}`,
        `${raw}.contact`,
        `${raw}.desk`,
        `team.${raw}`,
        `${raw}.solutions`,
      ],
      minimal: [
        `${raw}_v`,
        `${raw}hq`,
        `${raw}.x`,
        `i.${raw}`,
        `${raw}_io`,
        `${raw}.me`,
      ],
      creative: [
        `${raw}.created`,
        `the.${raw}.lab`,
        `${raw}.space`,
        `${raw}.digital`,
        `${raw}.studio.app`,
        `hello.${raw}`,
      ],
    };

    const rawIdeas = patterns[style] || patterns.aesthetic;

    // Filter to ensure all generated ideas strictly satisfy WhatsApp username rules
    const validIdeas = rawIdeas.filter((name) => validateUsername(name).valid);
    setIdeas(validIdeas);
  }

  function handleCopy(idea: string, index: number) {
    navigator.clipboard.writeText(`@${idea}`);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 sm:p-6 md:p-8 shadow-sm w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-center gap-2 border-b border-border pb-3 mb-1">
        <Sparkles className="w-5 h-5 text-emerald-500" />
        <h2 className="text-base sm:text-lg font-semibold text-foreground text-center">
          {t("title")}
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 w-full min-w-0">
          <Label htmlFor="idea-name">{t("nameLabel")}</Label>
          <Input
            id="idea-name"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={25}
            className="h-10 text-base sm:text-sm w-full"
          />
        </div>

        <div className="flex flex-col gap-2 w-full min-w-0">
          <Label htmlFor="idea-style">{t("styleLabel")}</Label>
          <Select
            value={style}
            onValueChange={(val) => setStyle(val as StyleCategory)}
          >
            <SelectTrigger id="idea-style" className="h-10 w-full text-base sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aesthetic">{t("styleAesthetic")}</SelectItem>
              <SelectItem value="business">{t("styleBusiness")}</SelectItem>
              <SelectItem value="minimal">{t("styleMinimal")}</SelectItem>
              <SelectItem value="creative">{t("styleCreative")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          onClick={generateIdeas}
          size="lg"
          className="w-full h-11 text-sm font-semibold mt-1 flex items-center justify-center gap-2"
        >
          <Lightbulb className="w-4 h-4" />
          {t("generateBtn")}
        </Button>
      </div>

      {ideas.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("resultsTitle")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ideas.map((idea, idx) => (
              <div
                key={idea}
                className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors text-xs"
              >
                <span className="font-mono font-semibold text-foreground">@{idea}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(idea, idx)}
                    className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                    title="Copiar"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {onSelectUsername && (
                    <button
                      type="button"
                      onClick={() => onSelectUsername(idea)}
                      className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors flex items-center gap-1 font-medium"
                      title="Usar no Gerador"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
