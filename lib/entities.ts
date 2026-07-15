import fs from "node:fs";
import path from "node:path";

export type Entity = {
  id: string;
  name: string;
  parent: string | null;
  definition: string;
  description: string;
  related: string[];
  articles: string[];
  guides: string[];
  faqs: { q: string; a: string }[];
  lastUpdated: string | null;
};

const CONTENT_ROOT = path.join(process.cwd(), "content", "entities");

export function getAllEntities(): Entity[] {
  if (!fs.existsSync(CONTENT_ROOT)) {
    return [];
  }

  return fs
    .readdirSync(CONTENT_ROOT)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(CONTENT_ROOT, file), "utf8")) as Entity);
}

export function getEntity(id: string): Entity | null {
  return getAllEntities().find((entity) => entity.id === id) ?? null;
}

export function getRelatedEntities(id: string): Entity[] {
  const entity = getEntity(id);

  if (!entity) {
    return [];
  }

  return entity.related
    .map((relatedId) => getEntity(relatedId))
    .filter((related): related is Entity => related !== null);
}

export function getChildren(id: string): Entity[] {
  return getAllEntities().filter((entity) => entity.parent === id);
}

export function getGapEntities(): Entity[] {
  const all = getAllEntities();
  const parentIds = new Set(all.map((entity) => entity.parent).filter(Boolean));

  return all.filter(
    (entity) =>
      entity.articles.length === 0 && entity.guides.length === 0 && !parentIds.has(entity.id)
  );
}
