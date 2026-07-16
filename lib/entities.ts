import fs from "node:fs";
import path from "node:path";
import { routing } from "@/i18n/routing";

export type Locale = (typeof routing.locales)[number];

export type FaqEntry = { q: string; a: string };

type EntityTranslation = {
  name: string;
  definition: string;
  description: string;
  faqs: FaqEntry[];
};

type RawEntity = {
  id: string;
  parent: string | null;
  related: string[];
  articles: string[];
  guides: string[];
  lastUpdated: string | null;
  translations: Record<Locale, EntityTranslation>;
};

export type Entity = {
  id: string;
  parent: string | null;
  related: string[];
  articles: string[];
  guides: string[];
  lastUpdated: string | null;
  name: string;
  definition: string;
  description: string;
  faqs: FaqEntry[];
};

const CONTENT_ROOT = path.join(process.cwd(), "content", "entities");

function loadRawEntities(): RawEntity[] {
  if (!fs.existsSync(CONTENT_ROOT)) {
    return [];
  }

  return fs
    .readdirSync(CONTENT_ROOT)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(CONTENT_ROOT, file), "utf8")) as RawEntity);
}

function resolve(raw: RawEntity, locale: string): Entity {
  const translation = raw.translations[locale as Locale] ?? raw.translations[routing.defaultLocale];

  return {
    id: raw.id,
    parent: raw.parent,
    related: raw.related,
    articles: raw.articles,
    guides: raw.guides,
    lastUpdated: raw.lastUpdated,
    name: translation.name,
    definition: translation.definition,
    description: translation.description,
    faqs: translation.faqs,
  };
}

export function getAllEntities(locale: string): Entity[] {
  return loadRawEntities().map((raw) => resolve(raw, locale));
}

export function getEntity(id: string, locale: string): Entity | null {
  const raw = loadRawEntities().find((entity) => entity.id === id);
  return raw ? resolve(raw, locale) : null;
}

export function getRelatedEntities(id: string, locale: string): Entity[] {
  const entity = getEntity(id, locale);

  if (!entity) {
    return [];
  }

  return entity.related
    .map((relatedId) => getEntity(relatedId, locale))
    .filter((related): related is Entity => related !== null);
}

export function getChildren(id: string, locale: string): Entity[] {
  return getAllEntities(locale).filter((entity) => entity.parent === id);
}

export function getGapEntities(locale: string): Entity[] {
  const all = getAllEntities(locale);
  const parentIds = new Set(all.map((entity) => entity.parent).filter(Boolean));

  return all.filter(
    (entity) =>
      entity.articles.length === 0 && entity.guides.length === 0 && !parentIds.has(entity.id)
  );
}
