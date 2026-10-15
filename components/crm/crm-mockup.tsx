import { useTranslations } from "next-intl";

/** Pure HTML/CSS mock of the WhatsApp inbox + AI reply + Kanban pipeline. */
export function CrmMockup() {
  const t = useTranslations("crm");
  const cols = t.raw("mockCols") as string[];

  return (
    <div
      aria-hidden="true"
      className="w-full max-w-xl rounded-2xl border bg-card p-3 shadow-lg grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs"
    >
      <div className="sm:col-span-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 flex flex-col gap-2">
        <div className="font-semibold text-emerald-700 dark:text-emerald-300">{t("mockInbox")}</div>
        <div className="self-start max-w-[85%] rounded-lg rounded-tl-none bg-background px-2.5 py-1.5 shadow-xs">
          {t("mockMsgIn")}
        </div>
        <div className="self-end max-w-[85%] rounded-lg rounded-tr-none bg-emerald-500 text-white px-2.5 py-1.5 shadow-xs">
          {t("mockMsgAi")}
        </div>
        <div className="self-end inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {t("mockAi")}
        </div>
      </div>
      <div className="sm:col-span-3 rounded-xl bg-muted/50 p-3">
        <div className="mb-2 font-semibold">{t("mockKanban")}</div>
        <div className="grid grid-cols-3 gap-2">
          {cols.map((col, i) => (
            <div key={col} className="rounded-lg bg-background p-2 min-h-24">
              <div className="mb-1.5 text-[10px] font-medium text-muted-foreground">{col}</div>
              {Array.from({ length: 3 - i }).map((_, j) => (
                <div key={j} className="mb-1.5 h-5 rounded bg-emerald-100 dark:bg-emerald-900/50" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
