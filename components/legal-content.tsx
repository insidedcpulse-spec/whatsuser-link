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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {lastUpdated ? <p className="mt-2 text-sm text-muted-foreground">{lastUpdated}</p> : null}
        <p className="mt-4 text-muted-foreground">{intro}</p>
      </div>

      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <div key={section.heading}>
            <h2 className="mb-2 text-lg font-semibold">{section.heading}</h2>
            {section.body.map((paragraph, index) => (
              <p key={index} className="text-sm text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
