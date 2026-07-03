import { getTranslations } from "next-intl/server";
import { JsonLdScript } from "@/components/json-ld-script";
import { getFaqJsonLd, type FaqItem } from "@/lib/json-ld";

export async function Faq() {
  const t = await getTranslations("faq");
  const items = t.raw("items") as FaqItem[];

  return (
    <section className="w-full max-w-md">
      <h2 className="mb-4 text-center text-lg font-semibold">{t("sectionTitle")}</h2>
      <dl className="flex flex-col gap-2">
        {items.map((item) => (
          <details key={item.question} className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">{item.question}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </dl>
      <JsonLdScript data={getFaqJsonLd(items)} />
    </section>
  );
}
