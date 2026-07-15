import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRelatedEntities } from "@/lib/entities";
import { getPost } from "@/lib/blog";

export async function RelatedEntities({
  entityId,
  locale,
  currentSlug,
}: {
  entityId: string;
  locale: string;
  currentSlug: string;
}) {
  const related = getRelatedEntities(entityId);

  const links = related
    .map((entity) => {
      const slug = entity.articles.find((s) => s !== currentSlug && getPost(locale, s) !== null);

      if (slug) {
        return { label: entity.name, href: `/blog/${slug}` };
      }

      if (entity.guides.length > 0) {
        return { label: entity.name, href: entity.guides[0] };
      }

      return null;
    })
    .filter((link): link is { label: string; href: string } => link !== null);

  if (links.length === 0) {
    return null;
  }

  const t = await getTranslations({ locale, namespace: "blog" });

  return (
    <div className="mt-10">
      <h2 className="mb-3 text-lg font-semibold">{t("relatedHeading")}</h2>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block rounded-full border px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
