import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { SiteFooter } from "@/components/site-footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "developers" });
  const path = locale === routing.defaultLocale ? "/developers" : `/${locale}/developers`;

  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: { canonical: path },
    openGraph: {
      title: t("title"),
      description: t("metaDescription"),
      url: path,
      siteName: siteConfig.name,
      type: "website",
    },
  };
}

const ENDPOINTS = [
  { path: "/api/v1/username-link?username=joao.silva&key=AB12&text=hello", descKey: "usernameLink" },
  { path: "/api/v1/phone-link?phone=351912345678&text=hello", descKey: "phoneLink" },
  { path: "/api/v1/validate/username?username=joao.silva", descKey: "validateUsername" },
  { path: "/api/v1/validate/key?key=AB12", descKey: "validateKey" },
  { path: "/api/v1/validate/phone?phone=351912345678", descKey: "validatePhone" },
  { path: "/api/v1/qr?username=joao.silva&format=svg&color=25d366", descKey: "qr" },
  { path: "/api/v1/openapi.json", descKey: "openapi" },
] as const;

const BUSINESS_ENDPOINTS = [
  {
    path: "/api/v1/business/bsuid/validate",
    descKey: "businessBsuidValidate",
    exampleBody: `{ "bsuid": "US.13491208655302741918" }`,
  },
  {
    path: "/api/v1/business/bsuid/parse",
    descKey: "businessBsuidParse",
    exampleBody: `{ "bsuid": "US.ENT.11815799212886844830" }`,
  },
  {
    path: "/api/v1/business/username/validate",
    descKey: "businessUsernameValidate",
    exampleBody: `{ "username": "joao.silva" }`,
  },
  {
    path: "/api/v1/business/contact/resolve",
    descKey: "businessContactResolve",
    exampleBody: `{ "username": "joao.silva" }`,
  },
  {
    path: "/api/v1/business/webhook/normalize",
    descKey: "businessWebhookNormalize",
    exampleBody: `{ "entry": [{ "changes": [{ "value": { "messages": [...], "contacts": [...] } }] }] }`,
  },
] as const;

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 font-mono text-sm">
      <code>{children}</code>
    </pre>
  );
}

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "developers" });

  const curlExample = `curl "${siteConfig.url}/api/v1/username-link?username=joao.silva"`;
  const jsExample = `const res = await fetch(
  "${siteConfig.url}/api/v1/username-link?username=joao.silva"
);
const data = await res.json();
console.log(data.link); // https://wa.me/joao.silva`;
  const curlBusinessExample = `curl -X POST "${siteConfig.url}/api/v1/business/bsuid/validate" \\
  -H "Content-Type: application/json" \\
  -d '{"bsuid": "US.13491208655302741918"}'`;
  const errorExample = `{
  "error": {
    "code": "username_length",
    "message": "Username must be 3-35 characters."
  }
}`;

  return (
    <div className="flex min-h-screen flex-col justify-between">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 md:py-16">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">{t("intro")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">{t("endpointsHeading")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("endpointsIntro", { baseUrl: siteConfig.url })}
          </p>
          <div className="flex flex-col gap-4">
            {ENDPOINTS.map((endpoint) => (
              <div key={endpoint.descKey}>
                <CodeBlock>{`GET ${endpoint.path}`}</CodeBlock>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`endpointDescriptions.${endpoint.descKey}`)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">{t("businessEndpointsHeading")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("businessEndpointsIntro", { baseUrl: siteConfig.url })}
          </p>
          <div className="flex flex-col gap-4">
            {BUSINESS_ENDPOINTS.map((endpoint) => (
              <div key={endpoint.descKey}>
                <CodeBlock>{`POST ${endpoint.path}`}</CodeBlock>
                <p className="mb-1 mt-2 text-xs font-medium text-muted-foreground">
                  {t("bodyLabel")}
                </p>
                <CodeBlock>{endpoint.exampleBody}</CodeBlock>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`endpointDescriptions.${endpoint.descKey}`)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">{t("examplesHeading")}</h2>
          <p className="mb-1 text-sm font-medium">{t("exampleCurlLabel")}</p>
          <CodeBlock>{curlExample}</CodeBlock>
          <p className="mb-1 mt-4 text-sm font-medium">{t("exampleJsLabel")}</p>
          <CodeBlock>{jsExample}</CodeBlock>
          <p className="mb-1 mt-4 text-sm font-medium">{t("exampleCurlBusinessLabel")}</p>
          <CodeBlock>{curlBusinessExample}</CodeBlock>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">{t("rateLimitHeading")}</h2>
          <p className="text-sm text-muted-foreground">{t("rateLimitBody")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">{t("errorsHeading")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("errorsBody")}</p>
          <CodeBlock>{errorExample}</CodeBlock>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">{t("noticeHeading")}</h2>
          <p className="text-sm text-muted-foreground">{t("noticeBody")}</p>
        </div>

        <a
          href="/api/v1/openapi.json"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          {t("openapiLinkLabel")}
        </a>
      </main>

      <SiteFooter />
    </div>
  );
}
