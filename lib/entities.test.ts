import { describe, expect, it } from "vitest";
import {
  getAllEntities,
  getEntity,
  getRelatedEntities,
  getChildren,
  getGapEntities,
} from "@/lib/entities";

describe("entity knowledge graph loader", () => {
  it("loads all 13 entities", () => {
    expect(getAllEntities()).toHaveLength(13);
  });

  it("returns null for an unknown entity id", () => {
    expect(getEntity("does-not-exist")).toBeNull();
  });

  it("reads a known entity's fields", () => {
    const entity = getEntity("username-key");

    expect(entity).not.toBeNull();
    expect(entity?.name).toBe("Username Key");
    expect(entity?.parent).toBe("usernames");
    expect(entity?.articles).toContain("username-key-whatsapp");
  });

  it("resolves related entities to full entity objects", () => {
    const related = getRelatedEntities("username-link");

    expect(related.map((e) => e.id).sort()).toEqual(
      ["api", "availability", "qr-code", "username-key"].sort()
    );
  });

  it("drops unknown ids when resolving related entities", () => {
    expect(getRelatedEntities("does-not-exist")).toEqual([]);
  });

  it("finds children of a parent entity", () => {
    const children = getChildren("usernames");

    expect(children.map((e) => e.id).sort()).toEqual(
      [
        "username-link",
        "username-key",
        "qr-code",
        "availability",
        "privacy",
        "security",
        "business",
        "api",
      ].sort()
    );
  });

  it("finds gap entities with no articles and no guides", () => {
    const gaps = getGapEntities().map((e) => e.id);

    expect(gaps.sort()).toEqual(["business-platform", "channels", "communities", "phone-links"].sort());
  });
});
