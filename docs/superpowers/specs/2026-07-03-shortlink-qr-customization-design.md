# WhatsUser.link v3 — Short Link, QR Customizável, Profile Card, Copiar Tudo

Data: 2026-07-03

## Objetivo

Evoluir o produto (specs anteriores: MVP `2026-07-02-whatsuser-link-mvp-design.md`, i18n `2026-07-02-i18n-username-key-theme-design.md`) com quatro melhorias pedidas pelo utilizador após testar o v2 em deploy real: link curto com domínio próprio, QR code customizável (cor/logo/transparência/formatos), reestilização do cartão de resultado como "perfil", e um botão que copia tudo de uma vez.

## Contexto (porquê)

- Utilizador testou o v2 na VPS (`http://2.25.169.27:3000`) e reportou dois problemas reais do fluxo de cópia (já corrigidos em `31d2f74` e `5558f81`, fora deste spec) e pediu esta ronda de features novas.
- Domínio `whatsuser.link` será comprado em breve, mas **não é dependência de código** — o link curto é implementado como redirect stateless, funciona em qualquer host (localhost, IP da VPS, ou o domínio final) via `NEXT_PUBLIC_SITE_URL`.
- Restrição de marca já conhecida do projeto (disclaimer de não-afiliação, ver spec i18n): logo do QR usa um ícone genérico de chat, não o logótipo oficial da WhatsApp, para evitar o mesmo risco de marca registada que já levou o utilizador a cancelar outros projetos.

## O que muda (visão geral)

1. **Short link stateless**: `whatsuser.link/<username>` redireciona (307) para `wa.me/u/<username>`. Sem base de dados, sem novo serviço — uma route handler.
2. **Fix de middleware**: regex de exclusão de ficheiros estáticos era `.*\..*` (qualquer ponto), o que quebraria usernames com ponto (ex. `joao.silva`). Passa a excluir só extensões estáticas conhecidas.
3. **QR customizável**: cor (color picker livre, default `#25D366`), logo genérico de chat opcional no centro, fundo transparente opcional, download em PNG/JPEG/SVG/PDF.
4. **Profile card**: reestilização do bloco username+key já existente (não é um elemento novo) com visual mais "cartão de perfil".
5. **Copiar tudo**: novo botão que copia username, key e link curto num único texto formatado — adicional aos botões de copiar já existentes, não os substitui.

Fora de scope: upload de logo customizado pelo utilizador, encurtamento com código aleatório (o "short" é sempre o próprio username), qualquer persistência/DB, suporte a mensagem no short link (mensagem só existe no formulário/resultado, não é codificada no link partilhável).

## Arquitetura — short link

```
app/
  [locale]/
    [username]/
      route.ts     # NOVO — GET handler, redirect stateless
middleware.ts       # MODIFICADO — matcher regex mais preciso
utils/
  validate-username.ts  # MODIFICADO — RESERVED_DOMAIN_SUFFIXES ganha extensões estáticas
```

### `app/[locale]/[username]/route.ts`

```ts
import { NextResponse } from "next/server";
import { validateUsername } from "@/utils/validate-username";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const { valid } = validateUsername(username);

  if (!valid) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(`https://wa.me/u/${username}`, 307);
}
```

Vive dentro de `[locale]/` porque o middleware do next-intl faz *rewrite* interno de pedidos sem prefixo (locale default) para `/<defaultLocale>/<resto-do-path>` — a rota tem de existir nesse segmento para o rewrite encontrar um match. Forma canónica partilhável: `whatsuser.link/rf1985` (sem prefixo, locale default). Formas com prefixo (`whatsuser.link/pt/rf1985`) também funcionam mas não são anunciadas.

### Fix do `middleware.ts`

Matcher atual:
```ts
matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"]
```

Novo matcher — exclui só extensões de ficheiro estático conhecidas, no fim do path:
```ts
matcher: [
  "/((?!api|_next|_vercel|.*\\.(?:ico|png|jpg|jpeg|gif|svg|css|js|mjs|map|json|txt|xml|webmanifest|woff|woff2|ttf)$).*)",
]
```

Isto permite que `/joao.silva` (username com ponto) passe pelo middleware normalmente, em vez de ser tratado como pedido de ficheiro estático e cair em 404.

### Fecho do buraco residual em `validate-username.ts`

Sem este fix, um username como `alguem.js` passaria a validação mas colidiria com a nova exclusão do matcher (o path pareceria um ficheiro `.js` e nunca chegaria à route handler). Para manter as duas listas coerentes, `RESERVED_DOMAIN_SUFFIXES` ganha as mesmas extensões:

```ts
const RESERVED_DOMAIN_SUFFIXES = [
  ".com", ".net", ".org", ".io", ".co", ".app",
  ".ico", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".css", ".js", ".mjs",
  ".map", ".json", ".txt", ".xml", ".webmanifest", ".woff", ".woff2", ".ttf",
];
```

(Existe já teste para `reservedDomain` — só precisa de mais um caso extra ou dois cobrindo uma extensão estática.)

### Link mostrado/copiado no resultado

`components/whatsapp/link-result.tsx`: o `link.url` (formato `wa.me/u/...`) deixa de ser o valor mostrado/copiado/aberto. Passa a computar-se `shortUrl = \`${siteConfig.url}/${link.username}\`` e usar esse valor no texto exibido, no botão "Copiar" principal e no `href` do botão "Abrir" (que abre o short link, que por sua vez redireciona para `wa.me/u/...`). Nenhuma mudança em `types/whatsapp.ts` nem em `services/link-service.ts` — `link.url` continua a existir internamente (podia ser útil no futuro), só não é mais o valor primário mostrado ao utilizador.

## Arquitetura — QR customizável

`components/whatsapp/qr-code-display.tsx` ganha estado e props novas:

```ts
interface QrCodeDisplayProps {
  value: string;
  downloadLabel: string;
}
```

Estado interno (o próprio componente passa a gerir cor/logo/transparência/formato — hoje só recebe `value`/`downloadLabel`, mantém-se assim para não obrigar `link-result.tsx` a saber destes detalhes):

- `color: string` (input `<input type="color">`, default `#25D366`)
- `includeLogo: boolean` (checkbox, default `false`)
- `transparent: boolean` (checkbox, default `false`, desativado visualmente quando formato = JPEG)
- `format: "png" | "jpeg" | "svg" | "pdf"` (segmented control, default `"png"`)

### Renderização

- Mantém `QRCodeCanvas` (de `qrcode.react`) visível no ecrã, com `fgColor={color}`, `bgColor={transparent ? "transparent" : "#ffffff"}`, e `level={includeLogo ? "H" : "M"}`.
- Quando `includeLogo`, passa `imageSettings={{ src: "/chat-icon.svg", height: 40, width: 40, excavate: true }}` — novo asset genérico (círculo verde + silhueta de bolha de conversa branca, **não** o logótipo oficial da WhatsApp).
- Para export SVG, renderiza em paralelo um `QRCodeSVG` (mesmo componente `qrcode.react`, variante SVG) escondido (`className="hidden"` ou fora do viewport), com as mesmas props, e extrai o `outerHTML` do nó na hora do download.

### Download por formato

- **PNG**: já existente — `canvas.toDataURL("image/png")`.
- **JPEG**: `canvas.toDataURL("image/jpeg")` — como JPEG não suporta alpha, se `transparent` estiver ligado, o canvas já terá sido pintado com `bgColor="#ffffff"` neste caso específico (a UI ignora/desliga o toggle transparente quando formato = JPEG, evitando fundo preto inesperado do `toDataURL`).
- **SVG**: serializa o `outerHTML` do `QRCodeSVG` escondido para um `Blob` (`image/svg+xml`) e cria um link de download.
- **PDF**: nova dependência `jspdf`. Pega no PNG do canvas (`toDataURL`), cria `new jsPDF()`, `doc.addImage(dataUrl, "PNG", x, y, w, h)`, `doc.save(...)`.

## Arquitetura — Profile card (reestilização)

Sem componente novo — `link-result.tsx` reestiliza o bloco username+key já existente (herdado do commit `5558f81`): `@` prefixado ao username, tipografia maior/bold para o username, key como linha secundária mais pequena por baixo. Sem avatar/foto (não há dados para isso). Sem mudança de dados/props.

## Arquitetura — Copiar tudo

Novo botão em `link-result.tsx`, junto aos outros. Usa `useCopyToClipboard` já existente. Texto copiado (com labels traduzidas via `useTranslations("result")`):

```
{t("usernameLabel")}
@{link.username}

{t("keyLabel")}          ← só se link.usernameKey existir
{link.usernameKey}

{t("shortLinkLabel")}
{shortUrl}
```

Novas chaves de tradução em `messages/{en,pt,es}.json`, namespace `result`: `copyAllButton`, `shortLinkLabel`.

## Novas dependências

- `jspdf` (export PDF). Sem outras — cor/logo/transparência/SVG usam capacidades já existentes de `qrcode.react`.

## Testing

- `utils/validate-username.test.ts`: novos casos cobrindo as extensões estáticas adicionadas a `RESERVED_DOMAIN_SUFFIXES` (ex. `"alguem.js"` → inválido, `reservedDomain`).
- Sem teste automatizado para a route handler do short link (é I/O de rede — `NextResponse.redirect`) nem para a UI do QR (canvas/SVG só testável fiavelmente em browser real) — verificação por smoke test manual/Playwright na VPS, como feito nas rondas anteriores: `curl -I http://2.25.169.27:3000/rf1985` (espera `307` + `location: https://wa.me/u/rf1985`), `curl -I http://2.25.169.27:3000/joao.silva` (espera passar pelo middleware sem 404 de ficheiro estático), download manual dos 4 formatos e inspeção visual de cor/logo/transparência.
- `pnpm test`, `tsc --noEmit`, `pnpm lint`, `pnpm build` continuam obrigatórios como nas rondas anteriores.

## Migração / risco

- Mudança de matcher em `middleware.ts` é sensível — regressão possível seria voltar a intercetar (ou deixar de intercetar) ficheiros estáticos reais; validar com `pnpm build` + smoke test de `/favicon.ico`, `/robots.txt` depois da mudança.
- Nenhuma mudança de contrato em `types/whatsapp.ts` ou `services/link-service.ts` — esta ronda é estritamente aditiva a nível de dados (só UI + uma rota nova).
- Risco de marca: mitigado à partida (ícone genérico, não logo oficial); disclaimer de não-afiliação já existente cobre também este uso.
