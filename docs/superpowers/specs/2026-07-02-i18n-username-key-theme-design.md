# WhatsUser.link v2 — i18n, Username Key, WhatsApp Theme

Data: 2026-07-02

## Objetivo

Evoluir o MVP existente (spec: `2026-07-02-whatsuser-link-mvp-design.md`) em quatro frentes, decididas em brainstorm após pesquisa de mercado (ver conversa): a WhatsApp não tem deep-link real por username, então o produto é reposicionado como "cartão de partilha honesto" (username + Username Key), com alcance internacional (EN base + PT + ES) e visual alinhado à marca WhatsApp.

## Contexto (porquê)

- Pesquisa confirmou: não existe formato de deep-link oficial (`wa.me/u/...` era aposta nossa, não confirmada). Contacto por username hoje exige a pessoa pesquisar manualmente dentro da app WhatsApp.
- WhatsApp introduziu opcionalmente uma **Username Key** (PIN, hoje 4 dígitos numéricos, evoluindo para alfanumérico): quem contacta pela primeira vez por username precisa saber username + key. Não há mecanismo nativo da WhatsApp para partilhar os dois juntos — esse é o espaço de produto que ninguém preencheu ainda (nicho vazio, feature lançada em massa só a partir de 29 jun 2026).
- Reposicionamento de copy: já não promete "abrir chat automaticamente" (tecnicamente impossível hoje) — passa a instruir honestamente "pesquisa isto dentro da tua app".

## O que muda (visão geral)

1. **i18n**: inglês (base), português, espanhol — deteção automática + troca manual.
2. **Validação por chaves de erro**: `validateUsername`/nova `validateUsernameKey` devolvem chaves de tradução, não frases fixas.
3. **Username Key**: novo campo opcional no formulário, mostrado no resultado lado a lado com o username.
4. **Tema WhatsApp**: paleta verde oficial (light `#25D366`, dark `#00A884`) substitui o tema neutro shadcn.
5. **Disclaimer de marca**: footer "não afiliado à WhatsApp/Meta", traduzido.
6. **Cookie técnico** `NEXT_LOCALE`: guarda escolha manual de idioma, sem banner de consentimento (não é tracking).

Fora de scope (continua a valer do spec original): login, DB, dashboard, pagamentos, API pública, admin, sitemap.xml, analytics/cookies de tracking.

## Arquitetura — reestruturação de rotas

Next.js App Router com segmento `[locale]`:

```
middleware.ts                 # detecção de locale (novo)
i18n/
  routing.ts                  # defineRouting({locales, defaultLocale, localePrefix}) (novo)
  request.ts                  # getRequestConfig p/ next-intl server-side (novo)
  navigation.ts               # createNavigation(routing) — Link/useRouter locale-aware (novo)
messages/
  en.json                     # inglês, idioma base (novo)
  pt.json                     # português (novo)
  es.json                     # espanhol (novo)
app/
  [locale]/
    layout.tsx                 # MOVIDO de app/layout.tsx; NextIntlClientProvider + generateMetadata por locale
    page.tsx                   # MOVIDO de app/page.tsx, sem mudança de lógica
  globals.css                  # fica na raiz (não é por-locale)
  robots.ts                    # fica na raiz (não é por-locale)
next.config.ts                 # MODIFICADO: wrap com createNextIntlPlugin()
```

`app/layout.tsx` deixa de existir como ficheiro separado — `app/[locale]/layout.tsx` passa a ser o root layout real (contém `<html>`/`<body>`), seguindo o padrão recomendado do next-intl para App Router.

**Locale prefix**: `as-needed` — inglês (default) serve em `/`, português em `/pt`, espanhol em `/es`.

## Deteção de idioma

Ordem de prioridade em `middleware.ts`:

1. Cookie `NEXT_LOCALE` (se o utilizador já trocou manualmente) — o middleware do next-intl já trata isto nativamente.
2. Header `Accept-Language` do browser — negociado automaticamente pelo middleware do next-intl (usa `negotiator` internamente) contra a lista de locales suportados.
3. **Fallback geo**: só quando o pedido não tem `Accept-Language` (raro — proxies/bots), o middleware lê o header `x-vercel-ip-country` (Vercel Edge) e mapeia país→idioma antes de delegar ao next-intl:
   - `PT` → `pt`
   - `ES`, `MX`, `AR`, `CO`, `CL`, `PE`, `VE` → `es`
   - qualquer outro → `en` (default)

   Esta lista de países é intencionalmente não-exaustiva (MVP) — mesma filosofia da lista de sufixos de domínio no spec original.
4. Sem cookie, sem Accept-Language, sem geo reconhecido → inglês.

## Troca manual de idioma

Novo `components/locale-switcher.tsx`: três botões/dropdown (EN/PT/ES) junto ao `theme-toggle.tsx` no layout. Usa `Link`/`useRouter` de `i18n/navigation.ts` (mantém a rota atual, só troca o prefixo de locale). A troca grava o cookie `NEXT_LOCALE` automaticamente (comportamento nativo do next-intl).

## Ficheiros de tradução

`messages/{en,pt,es}.json` — namespaces: `hero`, `form`, `result`, `errors`, `keyErrors`, `footer`, `metadata`. Todas as strings hoje hardcoded em `hero.tsx`, `username-generator.tsx`, `link-result.tsx`, `theme-toggle.tsx` (aria-label) e a descrição em `config/site.ts` migram para estes ficheiros.

## Validação — mudança de contrato

`utils/validate-username.ts`: `validateUsername()` mantém a mesma lógica de regras, mas `errors: string[]` passa a conter **chaves de tradução** (`"errors.length"`, `"errors.invalidChars"`, `"errors.noLetter"`, `"errors.startsWithWww"`, `"errors.reservedDomain"`) em vez de frases em português. Os componentes traduzem com `useTranslations("errors")` no momento de mostrar.

Novo `utils/validate-username-key.ts` (mesma forma, ficheiro próprio — responsabilidade própria):

```ts
import type { UsernameValidationResult } from "@/types/whatsapp";

const KEY_REGEX = /^[a-z0-9]{4,8}$/i;

export function validateUsernameKey(key: string): UsernameValidationResult {
  const errors: string[] = [];

  if (!KEY_REGEX.test(key)) {
    errors.push("keyErrors.invalidFormat");
  }

  return { valid: errors.length === 0, errors };
}
```

Chave é opcional: só é validada se o utilizador escrever algo no campo (string vazia = sem key, sem erro).

## Tipos (mudança)

`types/whatsapp.ts`:

```ts
export interface UsernameValidationResult {
  valid: boolean;
  errors: string[]; // chaves de tradução, não frases
}

export interface GeneratedLink {
  url: string;
  username: string;
  usernameKey?: string;
  message?: string;
}
```

`services/link-service.ts` — `LinkGenerationResult` simplifica para lista de erros combinada:

```ts
export type LinkGenerationResult =
  | { success: true; link: GeneratedLink }
  | { success: false; errors: string[] };

export function createWhatsAppLink(
  username: string,
  usernameKey?: string,
  message?: string
): LinkGenerationResult {
  const usernameValidation = validateUsername(username);
  const keyValidation = usernameKey ? validateUsernameKey(usernameKey) : { valid: true, errors: [] };

  const errors = [...usernameValidation.errors, ...keyValidation.errors];
  if (errors.length > 0) {
    return { success: false, errors };
  }

  const url = generateWhatsAppLink(username, message);

  return {
    success: true,
    link: { url, username, usernameKey: usernameKey?.trim() || undefined, message: message?.trim() || undefined },
  };
}
```

`lib/whatsapp/generateLink.ts` **não muda de assinatura** — a key não faz parte do URL (WhatsApp não suporta isso), é só mostrada como texto ao lado no resultado.

## Componentes afetados

- `components/hero.tsx` — usa `useTranslations("hero")`.
- `components/whatsapp/username-generator.tsx` — novo campo "Username Key" (opcional), erros traduzidos a partir das chaves, chama `createWhatsAppLink` com 3 argumentos.
- `components/whatsapp/link-result.tsx` — mostra username e key (se preenchida) em blocos separados, cada um com botão copiar próprio (reutiliza `useCopyToClipboard`); nota de formato reforça "pesquisa manualmente dentro da app".
- `components/theme-toggle.tsx` — aria-label traduzido.
- `components/locale-switcher.tsx` — novo.
- Footer com disclaimer de marca (dentro de `app/[locale]/page.tsx` ou `layout.tsx` — decisão de implementação, sem impacto de arquitetura).

## Tema WhatsApp (cores)

`app/globals.css` — variáveis CSS do shadcn:
- `--primary` (light): `#25D366` (verde WhatsApp claro)
- `--primary` (dark): `#00A884` (verde WhatsApp escuro, tom usado pela própria app em dark mode)
- Restantes variáveis (background, card, border, muted, destructive) mantêm-se neutras (light/dark já existentes) — só a cor de destaque/ação muda, garantindo contraste e legibilidade.

## Disclaimer de marca

Footer discreto, traduzido nos 3 idiomas: "WhatsUser.link não é afiliado, endossado ou associado à WhatsApp Inc. ou Meta." — mitiga risco de confusão de marca por usar nome/cor associados à WhatsApp (uso nominativo, sem logótipo, sem alegar afiliação).

## Testing

- `utils/validate-username.test.ts` — assertions atualizadas: verificar `errors` contém as **chaves** esperadas (ex.: `"errors.length"`) em vez de frases PT.
- Novo `utils/validate-username-key.test.ts`: key vazia → válida (opcional); 4-8 alfanuméricos → válida; 3 chars → inválida; 9 chars → inválida; símbolos → inválida.
- `services/link-service.test.ts` — atualizado para nova assinatura (3 argumentos) e novo formato de erro (`errors: string[]` em vez de `validation.errors`).
- Sem testes automatizados para as traduções em si (conteúdo estático) nem para deteção de locale no middleware (comportamento do next-intl, testado upstream) — smoke test manual: visitar `/`, `/pt`, `/es`, confirmar troca de idioma manual persiste (cookie) e testar Accept-Language via `curl -H "Accept-Language: pt"`.

## Migração / risco

- Mudança de contrato em `validateUsername`/`LinkGenerationResult` quebra os testes e componentes existentes do MVP — plano de implementação deve atualizar tudo isto como parte do mesmo conjunto de tasks (não é aditivo puro, é uma refactor coordenada).
- `app/layout.tsx` → `app/[locale]/layout.tsx` é uma mudança estrutural de rotas; qualquer link direto para `/` continua a funcionar (locale prefix "as-needed" mantém inglês na raiz).
