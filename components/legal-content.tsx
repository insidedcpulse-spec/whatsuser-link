import { SiteFooter } from "@/components/site-footer";

type LegalSection = {
  heading: string;
  body: string[];
};

export function LegalContent({
  title,
  lastUpdated,
  intro,
  sections,
}: {
  title: string;
  lastUpdated?: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="flex min-h-screen flex-col justify-between">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 md:py-16">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {lastUpdated ? <p className="mt-2 text-sm text-muted-foreground">{lastUpdated}</p> : null}
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">{intro}</p>
        </div>

        <div className="flex flex-col gap-8 border-t pt-8">
          {sections.map((section) => (
            <div key={section.heading} className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">{section.heading}</h2>
              {section.body.map((paragraph, index) => (
                <p key={index} className="text-sm text-muted-foreground leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
