# WhatsUser.link

Cria um link/cartão para o teu WhatsApp Username (`@username`) em segundos — link partilhável + QR code, sem login, sem base de dados.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript estrito · Tailwind CSS · shadcn/ui · pnpm.

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Testes

```bash
pnpm test        # Vitest — validação de username e geração de link
pnpm lint        # ESLint
pnpm exec tsc --noEmit   # type-check
pnpm build       # build de produção
```

## Nota importante: formato do link

A WhatsApp ainda não publicou uma spec oficial para deep-links por `@username`. Toda a lógica de formato do link está isolada em `lib/whatsapp/generateLink.ts` — é o único ficheiro que constrói o URL, e é a única alteração necessária quando a WhatsApp publicar o formato real. Ver `docs/superpowers/specs/2026-07-02-whatsuser-link-mvp-design.md` para o design completo.

## Variáveis de ambiente

```bash
cp .env.local.example .env.local
```

`NEXT_PUBLIC_SITE_URL` — domínio usado em metadata/OG/canonical (fallback `http://localhost:3000` em dev; o domínio `whatsuser.link` ainda não foi comprado).
