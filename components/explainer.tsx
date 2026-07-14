import { getTranslations } from "next-intl/server";

type ExplainerSection = {
  heading: string;
  body: string[];
};

export async function Explainer() {
  const t = await getTranslations("explainer");
  const sections = t.raw("sections") as ExplainerSection[];

  return (
    <section className="flex w-full max-w-2xl flex-col gap-6">
      <h2 className="text-center text-lg font-semibold">{t("sectionTitle")}</h2>
      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <div key={section.heading}>
            <h3 className="mb-2 font-medium">{section.heading}</h3>
            {section.body.map((paragraph, index) => (
              <p key={index} className="text-sm text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
