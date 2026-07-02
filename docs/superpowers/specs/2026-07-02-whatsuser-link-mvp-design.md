# WhatsUser.link — MVP Design

Data: 2026-07-02

## Objetivo

Gerar link/cartão para WhatsApp Username (`@username`, feature em rollout desde abril 2026). Sem login, DB, dashboard, pagamentos, API pública ou admin nesta fase. Apenas: input username + mensagem opcional → link + QR code, tudo client-side, sem reload.

## Contexto crítico: formato do link

WhatsApp ainda não publicou spec oficial de deep-link por username (equivalente ao `wa.me/<numero>`). Toda a lógica de construção de URL fica isolada em `lib/whatsapp/generateLink.ts` — nenhum outro módulo constrói a URL diretamente. Formato adotado (aposta, documentada em comentário no topo do ficheiro): `https://wa.me/u/<username>?text=<mensagem>`. Trocar este ficheiro deve ser a única alteração necessária quando a WhatsApp publicar o formato real.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript estrito (zero `any`) · Tailwind CSS · shadcn/ui · pnpm · qrcode.react (QR client-side) · Sonner (toast feedback) · next-themes (dark/light) · Vitest (unit tests).

## Arquitetura

```
whatsuser-link/
├── app/
│   ├── layout.tsx        # metadata, OG, fonts, ThemeProvider, Toaster
│   ├── page.tsx          # Server Component: Hero + Generator
│   ├── globals.css
│   └── robots.ts
├── components/
│   ├── ui/                       # shadcn: button, input, label, card, sonner
│   ├── hero.tsx
│   ├── theme-toggle.tsx
│   └── whatsapp/
│       ├── username-generator.tsx  # Client: form state, orquestra geração
│       ├── link-result.tsx         # Client: link, copiar, abrir, nota formato
│       └── qr-code-display.tsx     # Client: QR canvas + download PNG
├── lib/
│   └── whatsapp/
│       └── generateLink.ts   # ÚNICA fonte do formato de link
├── services/
│   └── link-service.ts       # valida + chama generateLink; ponto de extensão futuro (analytics, encurtamento)
├── hooks/
│   └── use-copy-to-clipboard.ts
├── types/
│   └── whatsapp.ts           # UsernameValidationResult, GeneratedLink
├── utils/
│   └── validate-username.ts  # regras oficiais + sanitização
├── config/
│   └── site.ts                # NEXT_PUBLIC_SITE_URL c/ fallback localhost:3000
└── public/
```

Componentes isolados: Server Component (`page.tsx`) não tem estado; toda interatividade vive em `components/whatsapp/*` (Client). `services/link-service.ts` é a única camada de negócio chamada pelos componentes — nunca constroem URL diretamente.

## Validação de username

Regras oficiais (WhatsApp 2026):
- 3–35 caracteres
- apenas `a-z`, `0-9`, `.`, `_`
- pelo menos 1 letra (não pode ser só números/símbolos)
- não pode começar com `www.`
- não pode terminar em domínio (`.com`, `.net`, `.org`, `.io`, `.co`, `.app`, etc.)

`utils/validate-username.ts` expõe:
- `sanitizeUsernameInput(raw: string): string` — chamado on-change: lowercase, remove `@`, espaços, chars fora do alfabeto permitido.
- `validateUsername(username: string): UsernameValidationResult` — devolve lista de erros por regra falhada (mensagens inline específicas, não erro genérico).

## Data flow

1. Input on-change → `sanitizeUsernameInput` normaliza em tempo real.
2. Submit → `username-generator.tsx` chama `services/link-service.ts` → valida (`validateUsername`) → se válido, chama `lib/whatsapp/generateLink.ts` → devolve `{ url }`.
3. Resultado guardado em state local → renderiza `link-result.tsx` sem reload de página.
4. Copiar: `hooks/use-copy-to-clipboard.ts` (Clipboard API) → sucesso dispara Sonner toast "Link copiado!"; falha → fallback seleciona texto do input + toast erro.
5. QR: `qr-code-display.tsx` usa `qrcode.react` a partir do `url` gerado; download PNG via canvas `toDataURL` + link `<a download>`.
6. Nota discreta sob o resultado: aviso não alarmista sobre o formato do link (ver secção contexto crítico).

## generateLink.ts (contrato)

```ts
// comentário topo: explica aposta de formato, motivo, o que fazer quando WhatsApp publicar spec oficial
export function generateWhatsAppLink(username: string, message?: string): string
```

Único ponto de construção de URL. Encoding de mensagem via `encodeURIComponent`. Sem dependências de outros módulos assumindo o formato.

## Error handling

Aplicação 100% client-side, sem rede própria — não há falhas de API a tratar. Único tratamento de erro:
- Validação de username: erros inline por regra, nunca bloqueio silencioso.
- Clipboard API indisponível/falha: fallback de seleção manual + toast de erro.
- Falha (rara) ao gerar PNG do QR: toast de erro.

## Testing

- Vitest para `utils/validate-username.ts`: casos fronteira (2/3/35/36 chars, começa `www.`, termina em domínio, só dígitos/símbolos, sanitização de `@`/espaços/chars inválidos).
- Vitest para `lib/whatsapp/generateLink.ts`: formato da URL, encoding de mensagem, comportamento sem mensagem.
- Sem E2E nesta fase. Smoke test manual em browser (light/dark, mobile/desktop) antes de considerar concluído.

## SEO

Metadata, Open Graph, Twitter Cards em `app/layout.tsx` usando `NEXT_PUBLIC_SITE_URL` (fallback `http://localhost:3000`) — nunca domínio hardcoded. `app/robots.ts` gerado via Next.js Metadata API. Sem `sitemap.xml` (rota única, sem justificação ainda).

## Fora de scope (MVP)

Login/registo, DB, dashboard/analytics, pagamentos, API pública, admin, i18n, encurtamento de links, domínios personalizados, pixels. Arquitetura (`services/`, `lib/`) preparada para extensão futura sem reescrita — mas nenhum ficheiro/pasta/tipo especulativo é criado agora.
