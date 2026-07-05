import { describe, expect, it } from "vitest";
import { GET } from "./route";

function call(locale: string, username: string) {
  return GET(new Request(`http://localhost/${locale}/${username}`), {
    params: Promise.resolve({ locale, username }),
  });
}

describe("[locale]/[username] redirect route", () => {
  it("404s for non-locale first segments like 'api' (never redirects API paths)", async () => {
    const res = await call("api", "v1");
    expect(res.status).toBe(404);
  });

  it("still 307-redirects a valid locale + username", async () => {
    const res = await call("en", "joao.silva");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://wa.me/joao.silva");
  });

  it.each(["about", "privacy", "faq", "contact", "legal", "terms"])(
    "404s for reserved site path '%s' instead of redirecting it as a username",
    async (reserved) => {
      const res = await call("en", reserved);
      expect(res.status).toBe(404);
    }
  );
});
