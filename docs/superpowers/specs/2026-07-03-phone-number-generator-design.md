# WhatsUser.link — Gerador por Número de Telefone (bloco temporário)

Data: 2026-07-03

## Objetivo

Adicionar um segundo gerador, baseado em número de telefone, **por cima** do gerador de username já existente (não o substitui). Resolve um problema concreto descoberto hoje: confirmámos empiricamente (curl ao servidor + teste num telemóvel real com WhatsApp instalada) que `wa.me/<username>` não abre conversa em nenhum formato testado. O formato por número (`wa.me/<numero>?text=`) é oficialmente documentado pela Meta e confirmado a funcionar — dá ao produto uma funcionalidade real e imediata enquanto o username não é confirmado.

## Contexto (porquê)

- Ver `docs/superpowers/specs/2026-07-03-shortlink-qr-customization-design.md` e a investigação do mesmo dia (dossiê `whatsusernames-dossier.html`) para o histórico completo da descoberta.
- Este bloco é **explicitamente temporário**: quando a WhatsApp confirmar/activar o link de username, o bloco de telefone deve ser removido e o gerador de username volta a ser o único/principal. Marcar isso com comentário no código, não só aqui.

## O que muda

1. Página (`app/[locale]/page.tsx`) passa a ter dois geradores empilhados, cada um com o seu título de secção:
   - **1º (topo)**: novo gerador por número de telefone.
   - **2º (scroll abaixo)**: gerador de username existente, inalterado.
2. Sem toggle/tabs — são duas secções independentes na mesma página, cada uma com o seu form e painel de resultado.
3. Nada do fluxo de username (`UsernameGenerator`, `LinkResult`, `validate-username.ts`, `link-service.ts`, `generateLink.ts`) é alterado.

## Arquitetura — novos ficheiros, mesmo padrão do resto do projeto

```
lib/
  countryCodes.ts            # NOVO — lista curada de ~20 países (código, nome, indicativo)
  whatsapp/
    generatePhoneLink.ts     # NOVO — única função que constrói o URL wa.me/<numero>
utils/
  validate-phone.ts          # NOVO — sanitizePhoneInput + validatePhoneNumber
services/
  phone-link-service.ts      # NOVO — createPhoneWhatsAppLink(phone, message)
components/whatsapp/
  phone-generator.tsx        # NOVO — form (país + número + mensagem)
  phone-link-result.tsx      # NOVO — painel de resultado (mais simples que o do username)
types/whatsapp.ts            # MODIFICADO — + GeneratedPhoneLink
messages/{en,pt,es}.json     # MODIFICADO — + namespace "phone", + "phoneErrors", + "form.sectionTitle"
app/[locale]/page.tsx        # MODIFICADO — adiciona <PhoneGenerator/> + títulos de secção
```

### `lib/whatsapp/generatePhoneLink.ts`

Espelha `generateLink.ts` (mesmo princípio: única função que constrói o URL, isolada), mas com comentário oposto — este formato **é** confirmado oficialmente:

```ts
/**
 * Formato oficialmente documentado pela WhatsApp Business Platform
 * (click-to-chat): https://wa.me/<numero>?text=<mensagem>
 * Ao contrário do formato de username em generateLink.ts, este formato
 * é confirmado e estável (Meta for Developers / WhatsApp Help Center).
 */
export function generatePhoneWhatsAppLink(phone: string, message?: string): string {
  const baseUrl = `https://wa.me/${phone}`;

  if (!message || message.trim().length === 0) {
    return baseUrl;
  }

  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}
```

O `phone` já chega sanitizado (só dígitos, indicativo + número concatenados) — sem `+`, espaços ou símbolos, replicando a regra que a própria Help Center da WhatsApp documenta para `wa.me/<numero>`.

### `utils/validate-phone.ts`

Mesma forma de retorno que `validate-username.ts` (`{ valid, errors }`, reaproveitando o tipo `UsernameValidationResult` já existente — o nome é histórico, mas a forma é genérica; não vale a pena renomear agora só por causa disto):

```ts
import type { UsernameValidationResult } from "@/types/whatsapp";

const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function validatePhoneNumber(phone: string): UsernameValidationResult {
  const errors: string[] = [];

  if (phone.length < MIN_DIGITS || phone.length > MAX_DIGITS) {
    errors.push("phoneErrors.invalidFormat");
  }

  return { valid: errors.length === 0, errors };
}
```

8–15 dígitos cobre o intervalo real de números internacionais (E.164 permite até 15 dígitos no total, incluindo indicativo).

### `types/whatsapp.ts` — adição

```ts
export interface GeneratedPhoneLink {
  url: string;
  phone: string;
  message?: string;
}
```

Tipo separado de `GeneratedLink` (não reaproveitado) — os dois fluxos têm formas diferentes o suficiente (sem `usernameKey`, sem necessidade de "short link" próprio) para não valer a pena forçar um tipo único com campos opcionais mutuamente exclusivos.

### `services/phone-link-service.ts`

```ts
import { generatePhoneWhatsAppLink } from "@/lib/whatsapp/generatePhoneLink";
import { validatePhoneNumber } from "@/utils/validate-phone";
import type { GeneratedPhoneLink } from "@/types/whatsapp";

export type PhoneLinkGenerationResult =
  | { success: true; link: GeneratedPhoneLink }
  | { success: false; errors: string[] };

export function createPhoneWhatsAppLink(phone: string, message?: string): PhoneLinkGenerationResult {
  const validation = validatePhoneNumber(phone);

  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const url = generatePhoneWhatsAppLink(phone, message);

  return {
    success: true,
    link: { url, phone, message: message?.trim() || undefined },
  };
}
```

### `lib/countryCodes.ts`

Lista curada (não exaustiva — os ~200 países ficam para depois se fizer falta), cobrindo os mercados dos 3 idiomas já lançados (PT, BR, ES/LatAm) mais os maiores mercados EN:

```ts
export interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: "PT", name: "Portugal", dialCode: "351" },
  { code: "BR", name: "Brasil", dialCode: "55" },
  { code: "ES", name: "España", dialCode: "34" },
  { code: "US", name: "United States", dialCode: "1" },
  { code: "GB", name: "United Kingdom", dialCode: "44" },
  { code: "FR", name: "France", dialCode: "33" },
  { code: "DE", name: "Deutschland", dialCode: "49" },
  { code: "IT", name: "Italia", dialCode: "39" },
  { code: "MX", name: "México", dialCode: "52" },
  { code: "AR", name: "Argentina", dialCode: "54" },
  { code: "CO", name: "Colombia", dialCode: "57" },
  { code: "CL", name: "Chile", dialCode: "56" },
  { code: "PE", name: "Perú", dialCode: "51" },
  { code: "VE", name: "Venezuela", dialCode: "58" },
  { code: "IN", name: "India", dialCode: "91" },
  { code: "AO", name: "Angola", dialCode: "244" },
  { code: "MZ", name: "Moçambique", dialCode: "258" },
  { code: "CV", name: "Cabo Verde", dialCode: "238" },
  { code: "CA", name: "Canada", dialCode: "1" },
  { code: "AU", name: "Australia", dialCode: "61" },
];
```

### Componentes

`components/whatsapp/phone-generator.tsx` — mesmo padrão de `username-generator.tsx` (form controlado, `useState`, submete para `createPhoneWhatsAppLink`, mostra `PhoneLinkResult` quando há link). Campos: `<select>` nativo de país (sem novo componente shadcn — não existe `ui/select.tsx` no projeto, adicionar um só por causa disto seria overkill), input de número, input de mensagem (reaproveita `form.messageLabel`/`messagePlaceholder` já traduzidos).

`components/whatsapp/phone-link-result.tsx` — mais simples que `link-result.tsx`: só link + QR + copiar/abrir + reset. Sem key, sem "copy all", sem short-link próprio (o `wa.me/<numero>` já é o link final e curto — não faz sentido embrulhar num link nosso, isso só tinha valor para o username por causa da incerteza de formato).

### Traduções — novas chaves

Namespace novo `"phone"` + `"phoneErrors"` + uma chave nova em `"form"` para o título da secção de username (que agora precisa de header, já que há duas secções na página):

```json
"form": { ..., "sectionTitle": "Generate by Username" },
"phone": {
  "sectionTitle": "Generate by Phone Number",
  "countryLabel": "Country",
  "phoneLabel": "WhatsApp Phone Number",
  "phonePlaceholder": "912 345 678",
  "submit": "Generate Link"
},
"phoneErrors": { "invalidFormat": "Enter a valid phone number." }
```

(equivalentes em pt/es). O painel de resultado reaproveita chaves já existentes em `"result"` (`copyButton`, `openButton`, `copySuccess`, `copyError`, `downloadQr`, `resetButton`) — nenhuma chave nova aí.

### `app/[locale]/page.tsx`

```tsx
import { getTranslations } from "next-intl/server";
import { Hero } from "@/components/hero";
import { PhoneGenerator } from "@/components/whatsapp/phone-generator";
import { UsernameGenerator } from "@/components/whatsapp/username-generator";

export default async function Home() {
  const t = await getTranslations("footer");
  const tPhone = await getTranslations("phone");
  const tForm = await getTranslations("form");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 px-4 py-24">
      <Hero />

      {/*
        TEMPORÁRIO: confirmámos em 2026-07-03 (servidor + telemóvel real)
        que wa.me/<username> ainda não abre conversa. Este bloco dá aos
        visitantes um link que funciona hoje. Remover quando o link de
        username for confirmado a funcionar — o gerador abaixo volta a
        ser o único/principal.
      */}
      <div className="w-full max-w-md">
        <h2 className="mb-4 text-center text-lg font-semibold">{tPhone("sectionTitle")}</h2>
        <PhoneGenerator />
      </div>

      <div className="w-full max-w-md">
        <h2 className="mb-4 text-center text-lg font-semibold">{tForm("sectionTitle")}</h2>
        <UsernameGenerator />
      </div>

      <p className="max-w-md text-center text-xs text-muted-foreground">{t("disclaimer")}</p>
    </main>
  );
}
```

## Testing

- `utils/validate-phone.test.ts` (novo, TDD): número com 7 dígitos → inválido; 8 dígitos → válido; 15 dígitos → válido; 16 dígitos → inválido; `sanitizePhoneInput` remove espaços/traços/parênteses/`+`.
- `services/phone-link-service.test.ts` (novo): número válido sem mensagem → URL correto; com mensagem → `?text=` encoded; número inválido → `errors` contém `phoneErrors.invalidFormat`.
- Sem teste automatizado para os componentes React (mesma política já usada no resto do projeto) — verificação manual/Playwright na VPS.

## Fora de scope (fica para depois, conforme já combinado)

- Link personalizado / custom slug (`w.app/SuaEmpresa`-style) — exige persistência, quebra a arquitetura 100% stateless actual, fica reservado para o plano Business já descrito no roadmap.
- Lista completa de códigos de país (~200) — a lista curada de 20 cobre os mercados já lançados; expandir é aditivo, não é decisão de arquitetura.
