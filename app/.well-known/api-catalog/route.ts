import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

// RFC 9727 API catalog: lets agents discover the public API without scraping docs.
export function GET(): Response {
  const body = {
    linkset: [
      {
        anchor: `${siteConfig.url}/api/v1`,
        "service-desc": [
          {
            href: `${siteConfig.url}/api/v1/openapi.json`,
            type: "application/vnd.oai.openapi+json",
          },
        ],
        "service-doc": [{ href: `${siteConfig.url}/developers`, type: "text/html" }],
      },
    ],
  };

  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/linkset+json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
