# Pesquisa técnica: WhatsApp Usernames + Business-Scoped User IDs (BSUID)

Data: 2026-07-05
Âmbito: Fase 1 (pesquisa obrigatória) da missão de expansão do WhatsUsernames.link para a WhatsApp Business Platform / Cloud API.

Todas as afirmações abaixo citam a fonte usada. Onde a doc oficial não confirma algo, está marcado explicitamente como limitação/dúvida em aberto — nada foi inventado.

---

## 1. O que são "Usernames" no Business Platform / Cloud API (vs. o wa.me consumer atual)

O código atual do repo (`lib/whatsapp/generateLink.ts`) implementa **apenas** o username *consumer* do WhatsApp normal (link `wa.me/<username>`), um recurso de rollout regional/faseado, sem relação direta com APIs de negócio.

A nova feature "WhatsApp Usernames" (2026) é distinta e opera a outro nível:

- É um **@username opcional** que um utilizador WhatsApp pode definir para ser mostrado a negócios **em vez do número de telefone**.
- "A user username is a unique, optional name that WhatsApp users can set in order to display their username instead of their phone number in the app." — [About the WhatsApp Business Platform / usernames doc](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/)
- Utilizador só pode ter 1 username, mas pode mudá-lo periodicamente; mudar o username **não** afeta o número de telefone nem o BSUID, nem a capacidade de comunicar. (mesma fonte)
- Para negócios: "A business username is mapped to a single business phone number across all of WhatsApp... a phone number can have only one username at a given time, and no two WhatsApp phone numbers (consumer or business) can have the same username." — resultado de pesquisa citando a doc oficial de Business-scoped user IDs.
- Negócios podem reservar/reclamar usernames baseados no Display Name, Official Business Account, Meta Verified name, ou handles do Facebook/Instagram.
- Relação com o wa.me consumer atual: **são conceitos relacionados mas tecnicamente distintos**. O wa.me/<username> é a face pública/link do username consumer; o username no Cloud API é o mesmo dado de identidade mas exposto via API (`username` property em respostas/webhooks), não via link público. Não encontrei doc oficial que unifique os dois de forma explícita nesta pesquisa — **marcado como ponto a validar antes de reaproveitar código existente**.

Fonte primária: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/

---

## 2. O que é BSUID — formato, propósito

- "A BSUID is a unique user identifier that can be used to message a WhatsApp user when you don't know their phone number." Está ligado a um portfólio de negócio específico.
- **Formato exato**: `ISO 3166 alpha-2 country code` + `.` (ponto) + até 128 caracteres alfanuméricos.
  Exemplo oficial: `US.13491208655302741918`
- Regra de uso: "use the entire BSUID value: country code, period, and all alphanumeric characters" — não deve ser parseado/dividido para uso em requests, é opaco.
- **BSUID é scoped a portfólio**: só números de telefone de negócio dentro do mesmo portfólio conseguem mandar mensagem para um dado BSUID; tentativa cross-portfolio falha.
- **Parent BSUID** (contas geridas com múltiplos portfólios elegíveis): formato `US.ENT.11815799212886844830` — funciona entre portfólios inscritos, mantendo controlo de acesso e faturação independentes.

Fonte: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/

---

## 3. Alterações introduzidas pelos Usernames

- Campo `username` passa a ser atribuído/exposto na `username` property em API responses e webhook payloads.
- Uma vez ativado, o username do utilizador aparece em todos os webhooks de mensagens recebidas, e em webhooks de status "delivered"/"read".
- Reserva/claim de username para negócios via WhatsApp Manager, Meta Business Suite, ou API.
- Estado "reserved": username reservado ao número mas ainda não visível a utilizadores WhatsApp — só fica visível quando o recurso for disponibilizado a todos.

Fonte: pesquisa citando doc oficial (ver secção 1) + resultados de busca sobre reserva/claim.

---

## 4. Alterações introduzidas pelo BSUID

- Passa a existir um `user_id` (BSUID) atribuído em **todos os webhooks de mensagens**, quer o utilizador tenha ou não ativado username.
- Nos webhooks de mensagens recebidas: campos `from_user_id` (mensagem) e `user_id` (dentro do bloco `contacts`).
- Nos webhooks de status (sent/delivered/read): `recipient_user_id` + `user_id` no bloco `contacts`.
- Em status de falha: bloco `contacts` é omitido inteiramente.
- Quando um utilizador adota username, o campo `wa_id` (telefone) pode ser **omitido** do webhook — exceto se:
  1. Negócio mandou mensagem ao utilizador nos últimos 30 dias, ou
  2. Negócio recebeu mensagem do utilizador nos últimos 30 dias, ou
  3. O utilizador está no contact book do negócio.

### Exemplo de payload (mensagem recebida), conforme doc oficial:
```json
{
  "contacts": [{
    "profile": {"name": "User Name", "username": "username"},
    "wa_id": "16505551234",
    "user_id": "US.13491208655302741918"
  }],
  "messages": [{
    "from": "16505551234",
    "from_user_id": "US.13491208655302741918"
  }]
}
```

Fonte: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/

### ⚠️ Inconsistência documental encontrada (não inventar, registar)
Ao ler diretamente as páginas de referência genéricas de webhook — [messages webhook reference](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages) e [contacts messages webhook reference](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/contacts/) — **os campos `user_id`, `from_user_id`, `recipient_user_id` e `username` não estão documentados nelas** (em 2026-07-05). Essas páginas ainda só mostram `wa_id`, `profile.name`, e o objeto de contacto partilhado (endereços, telefones, etc.), com a nota "a WhatsApp user's ID and phone number may not always match". Só a página dedicada de Business-Scoped User IDs documenta os novos campos.
**Implicação prática**: a doc oficial ainda não está totalmente unificada entre a página de BSUID e as páginas de referência genéricas de webhook. Ao construir o normalizer, tratar a página BSUID como fonte de verdade para estes campos, mas validar contra payloads reais antes de assumir 100% de cobertura — comportamento pode variar por versão da Graph API.

---

## 5. Impacto em integrações existentes

- Qualquer integração que assuma `wa_id`/`from` como **sempre telefone** vai quebrar quando o utilizador tiver username ativo e não se enquadrar nas exceções dos 30 dias / contact book.
- "Supporting business-scoped user IDs (BSUID) is required for all partners and directly-integrated businesses on the WhatsApp Business Platform" — obrigatório, não opcional.
- Fluxos de autenticação **não são compatíveis com BSUID**: "one-tap, zero-tap, and copy code authentication templates... require user phone numbers" — continuam a exigir número real.
- Parent BSUIDs: não suportam bloquear/desbloquear utilizadores; contact books não sincronizam entre portfólios múltiplos.

Fonte: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/

---

## 6. Impacto em bases de dados

Padrão observado em discussões de projetos OSS reais que já estão a adaptar-se (ver secção 10):

- Necessidade de nova coluna persistente para BSUID (ex.: `bsuid` / `whatsapp_user_id`), separada do identificador de telefone.
- Chave de resolução de contacto deixa de poder ser só `phone` (E.164) — recomenda-se **dual-key**: tentar match por BSUID primeiro, fallback para telefone, e escrever o BSUID de volta quando o match for feito por telefone (estratégia documentada na issue do Chatwoot, não na doc oficial da Meta — é prática de comunidade, não requisito Meta).
- Campo `username` (string, opcional, mutável) precisa de storage próprio — não é chave estável (pode mudar), ao contrário do BSUID que é o identificador estável por portfólio.

Fonte: prática de comunidade (Chatwoot issue #13837) — https://github.com/chatwoot/chatwoot/issues/13837. **Não é doc oficial Meta**, citado como referência de arquitetura, não como requisito.

---

## 7. Impacto em webhooks (payloads antes/depois)

**Antes (payload clássico, sem username):**
```json
{
  "contacts": [{"profile": {"name": "User Name"}, "wa_id": "16505551234"}],
  "messages": [{"from": "16505551234", "id": "...", "type": "text"}]
}
```

**Depois (utilizador com username ativo, dentro da janela de 30 dias):**
```json
{
  "contacts": [{
    "profile": {"name": "User Name", "username": "username"},
    "wa_id": "16505551234",
    "user_id": "US.13491208655302741918"
  }],
  "messages": [{"from": "16505551234", "from_user_id": "US.13491208655302741918", "id": "...", "type": "text"}]
}
```

**Depois, fora da janela de 30 dias (sem contact book / sem interação recente):**
`wa_id`/`from` podem ser omitidos, restando apenas `user_id`/`from_user_id`.

Fonte: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/

---

## 8. Novos campos

| Campo | Onde aparece | Tipo | Fonte |
|---|---|---|---|
| `user_id` (BSUID) | bloco `contacts` em qualquer webhook de mensagem | string (`CC.alfanum`) | doc BSUID |
| `from_user_id` | `messages[]` (mensagens recebidas) | string (BSUID) | doc BSUID |
| `recipient_user_id` | `statuses[]` (status sent/delivered/read) | string (BSUID) | doc BSUID |
| `username` | `contacts[].profile.username` e API responses | string, opcional, mutável | doc BSUID + pesquisa usernames |
| `parentBsuid` | mencionado por integrador terceiro (tyntec) para contas com portfólios múltiplos | string | tyntec api-collection (terceiro, não Meta — confirmar antes de usar nomenclatura) |

---

## 9. Novos eventos / limitações conhecidas

**Timeline de rollout — CONFIRMADA por fetch direto à doc oficial** (`https://developers.facebook.com/docs/whatsapp/business-scoped-user-ids`, path alternativo ao usado na 1ª ronda; o path `/documentation/business-messaging/whatsapp/changelog` continua a devolver HTTP 500, mas este path serviu o mesmo conteúdo com sucesso — tratar como a mesma fonte primária):

- **Início de abril de 2026**: BSUIDs começam a aparecer nos webhooks. Texto oficial: "BSUIDs began appearing in webhooks in early April 2026."
- **Até julho de 2026, envio por BSUID NÃO era suportado**: "Our APIs will not support sending messages targeted to the BSUIDs until July 2026." — ou seja, na data de hoje (2026-07-05) esta capacidade pode já ter sido ativada ou estar prestes a ativar; **confirmar estado atual antes de decidir suportar/bloquear envio por BSUID no design da API**.
- **Início de julho de 2026**: disponibilidade do botão `REQUEST_CONTACT_INFO` (pedir número de telefone a um utilizador WhatsApp). Texto oficial: "This feature will be available in early July 2026."
- **29 de junho de 2026**: início da reserva de username para negócios. Texto oficial: "Starting June 29, 2026 you can begin reserving your business username." (confirmado também por fonte secundária, TechCrunch 2026-06-29).
- Rollout geral de usernames para consumidores: "WhatsApp will start rolling out usernames gradually in 2026" — sem data fixa, faseado.
- Aviso da própria Meta na página: "Any changes described in this document are subject to change." — tratar todas as datas acima como sujeitas a alteração, não como garantia contratual.
- Requisito de suporte obrigatório a BSUID citado por múltiplos parceiros terceiros (Twilio, Vonage, Infobip, Zendesk, Chatwoot) continua sem texto literal Meta encontrado nesta pesquisa além do já registado na secção 5 ("required for all partners and directly-integrated businesses").

**Limitações confirmadas:**
- BSUID não serve para templates de autenticação one-tap/zero-tap/copy-code (exigem telefone real).
- Parent BSUID não suporta block/unblock.
- Contact books não sincronizam entre múltiplos portfólios num parent BSUID.
- Página genérica de referência de webhooks (`messages`, `contacts`) ainda não documenta os novos campos (ver secção 4) — tratar doc BSUID dedicada como fonte de verdade.
- Página do Message API (envio) ainda **não documenta** enviar mensagem tendo BSUID/username como destinatário no campo `to` — apenas telefone e group-id são documentados nessa página no momento da pesquisa. **Isto é uma lacuna real ou a feature ainda não está disponível para envio — não assumir que a API de envio já aceita username/BSUID como `to` sem confirmação adicional.** Doc oficial (secção 9) confirma que envio por BSUID só foi liberado (ou fica prestes a liberar) em julho de 2026 — coincide com a data desta pesquisa, por isso o "ainda não" pode já ter mudado.

## Charset username de negócio — pesquisa dirigida (RESOLVIDO)

Bloqueio da 1ª ronda resolvido via fetch direto à mesma página oficial (`https://developers.facebook.com/docs/whatsapp/business-scoped-user-ids`):

- **Caracteres permitidos**: apenas letras inglesas minúsculas/maiúsculas equivalentes `a-z`, dígitos `0-9`, ponto (`.`) e underscore (`_`). Texto oficial: *"non-English characters (such as ñ, é, ü) are not supported and will cause the request to fail."*
- **Comprimento**: 3 a 35 caracteres, tem de conter pelo menos 1 letra.
- **Regras estruturais**: não pode começar/terminar com ponto; não pode ter 2 pontos consecutivos; não pode começar com `www`; não pode terminar em domínio (`.com`, `.org`, `.net`, `.int`, `.edu`, `.gov`, `.mil`, `.us`, `.in`, `.html`, etc.).
- **Case sensitivity parcial**: comparação ignora maiúsculas/minúsculas, mas **não** ignora ponto/underscore. Texto oficial: *"case is ignored when comparing usernames, but period and underscore characters are not; for example, myID and myid are the same username but myid, my.id, and my_id are all distinct."*
- Confirmado por múltiplas fontes secundárias independentes (BusinessToday 2026-06-30, TechCrunch 2026-06-29) — sem conflito entre fontes desta vez.
- **Decisão de design**: regex de validação pode ser especificado com confiança total (fonte primária + confirmação de charset). Sugestão: `/^(?!.*\.\.)(?!.*\bwww\b)[a-z0-9._]{3,35}$/i` + checagem separada de "não termina em domínio conhecido" + "contém pelo menos 1 letra" + "não começa/termina em ponto".

---

## 10. Boas práticas recomendadas pela Meta

- Usar o BSUID inteiro sem parsing (tratar como opaco), incluindo país+ponto+alfanumérico.
- Não depender de `wa_id` estar sempre presente — tratar como opcional a partir do rollout.
- Aproveitar o contact book hospedado pela Meta (não requer trabalho de integração) para continuidade de conversa — mas pode ser desativado nas definições do Meta Business Suite, portanto não confiar cegamente nele.
- Suportar mensagens tanto por telefone como por BSUID quando ambos disponíveis (fallback duplo).

Fonte: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/

---

## 11. Oportunidades concretas para a API do WhatsUsernames.link

Com base no que está documentado, a nova secção da API pode oferecer, sem inventar comportamento:

1. **`POST /api/v1/bsuid/validate`** — valida formato `CC.alfanum` (regex: 2 letras ISO 3166 + `.` + 1-128 alfanuméricos), incluindo variante Parent BSUID (`CC.ENT.alfanum`).
2. **`POST /api/v1/bsuid/parse`** — devolve `{ countryCode, id, isParent }` a partir de um BSUID válido.
3. **`POST /api/v1/username/validate`** — valida username de negócio conforme regras documentadas (unicidade cross-consumer/business, mapeamento 1:1 com número).  **Nota: regras de caracteres permitidos (charset exato) não foram encontradas explicitamente na doc oficial nesta pesquisa — marcar como dúvida em aberto a resolver antes de implementar o validador, não assumir regex genérico de @handle.**
4. **`POST /api/v1/contact/resolve`** — dado telefone OU BSUID OU username, devolve o formato unificado `{id, type, username, phone, bsuid, displayName}` pedido na missão — mas **type** deve refletir claramente que o dado pode estar incompleto (ex.: `phoneKnown: boolean`, `bsuidKnown: boolean`) dado que a Meta pode omitir campos conforme a janela de 30 dias.
5. **`POST /api/v1/webhook/normalize`** — recebe payload bruto do Cloud API (webhook), devolve estrutura normalizada e estável, absorvendo a variação "com/sem wa_id", "com/sem username". Arquitetura deve isolar o "shape" da Meta atrás de um adapter, para permitir plugar outros fornecedores (Twilio, Infobip, etc. já enfrentam o mesmo BSUID) sem tocar na interface pública — confirma o padrão visto no SDK Kapso (`normalizeWebhook()` retorna shape padronizado, independente do payload bruto).

---

## 12. Projetos OSS analisados — lições de arquitetura (sem código copiado)

| Projeto | Relevância | Lição de arquitetura |
|---|---|---|
| [WhatsApp/WhatsApp-Nodejs-SDK](https://github.com/WhatsApp/WhatsApp-Nodejs-SDK) | SDK oficial Meta, **arquivado desde jun/2023** | Estrutura modular `src/` + tipos TS dedicados; **não** tem suporte a BSUID/username (arquivado antes da feature existir) — não pode ser fonte de verdade para esta feature. |
| [gokapso/whatsapp-cloud-api-js](https://github.com/gokapso/whatsapp-cloud-api-js) | SDK TS de terceiro, ativo | Padrão relevante: client façade por domínio (`client.messages`, `client.contacts`); `normalizeWebhook()` dedicado que desembrulha payload bruto em shape estável camelCase; `verifySignature()` separado para validação HMAC; builders tipados em vez de payloads soltos. Ainda **não expõe tipos dedicados para BSUID/username** — oportunidade real de diferenciação para o SDK do WhatsUsernames.link. |
| [chatwoot/chatwoot issue #13837](https://github.com/chatwoot/chatwoot/issues/13837) | Discussão de produto real a adaptar-se ao BSUID | Estratégia de dual-key contact resolution (BSUID-first, fallback telefone, write-back) — prática de comunidade a considerar no design do `Contact resolve` endpoint. |
| [WhiskeySockets/Baileys issue #2516](https://github.com/WhiskeySockets/Baileys/issues/2516) | Confirma timeline (abril 2026) e formato BSUID de forma independente | Corrobora dados da doc oficial (triangulação de fonte). |
| [wwebjs/whatsapp-web.js issue #201728](https://github.com/wwebjs/whatsapp-web.js/issues/201728) | Confirma que `wa_id` passa a ser opcional/omitido por privacidade | Reforça necessidade de tratar telefone como opcional em qualquer schema/tipo TS. |
| tyntec api-collection (`conversations/v3`) | Integrador terceiro (não Meta) já documentando `bsuid`, `parentBsuid`, `username` como campos de webhook próprios | Nomenclatura **não é oficial Meta** — usar como referência de mercado, não como especificação. Confirma que múltiplos fornecedores estão a convergir para nomes semelhantes, o que valida a escolha de nomes (`bsuid`, `username`) no design da API própria. |

Nenhum código foi copiado — apenas padrões estruturais (normalizer isolado, client façade, dual-key resolution, builders tipados).

---

## 13. Limitações / dúvidas em aberto que precisam decisão antes do brainstorm da Fase 2

1. ~~Changelog oficial devolveu HTTP 500~~ — **RESOLVIDO na pesquisa dirigida (2026-07-05)**: path alternativo `https://developers.facebook.com/docs/whatsapp/business-scoped-user-ids` serviu a doc com sucesso e continha as datas de rollout diretamente (ver secção 9). O path `/documentation/business-messaging/whatsapp/changelog` continua a falhar com 500, mas deixou de ser bloqueante.
2. ~~Charset do username de negócio não documentado~~ — **RESOLVIDO na pesquisa dirigida (2026-07-05)**: regra completa encontrada na mesma página oficial (ver secção "Charset username de negócio"). Validador pode ser implementado com confiança total.
3. **Relação exata entre username consumer (wa.me) e username de negócio Cloud API** não está unificada em nenhuma página oficial lida — são a mesma entidade de dados (o username é global e único cross-consumer/business) mas expostos por superfícies diferentes. Isto tem impacto direto em decidir se o código existente (`lib/whatsapp/generateLink.ts`) deve ser reaproveitado ou se a nova secção deve ser 100% independente. **Decisão do user: manter módulos separados** (namespace Business/BSUID próprio, sem tocar no consumer existente).
4. **Envio de mensagem usando username/BSUID como destinatário** (`to` no Message API) — doc oficial confirma agora que isto só ficou disponível a partir de julho de 2026 (ver secção 9), ou seja pode já estar ativo à data desta pesquisa. **Decisão do user: Fase 2 cobre só receber/normalizar, sem suportar envio** — este ponto fica registado para uma fase futura, não bloqueia o design atual.
5. Nomenclatura `parentBsuid` só vista em doc de integrador terceiro (tyntec), não em doc Meta direta — confirmar se Meta usa outro nome oficial antes de adotar no SDK. **Ainda em aberto**, não bloqueante (afeta só naming, não comportamento).

---

## Fontes usadas

- https://developers.facebook.com/docs/whatsapp/business-scoped-user-ids (fonte primária, fetch direto — pesquisa dirigida 2026-07-05, resolveu timeline + charset username)
- https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/ (fonte primária, fetch direto)
- https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages (fetch direto)
- https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/contacts/ (fetch direto)
- https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api (fetch direto)
- https://developers.facebook.com/documentation/business-messaging/whatsapp/changelog (fetch falhou, HTTP 500 — não bloqueante, ver path alternativo acima)
- https://developers.facebook.com/docs/graph-api/changelog/ (fetch direto — confirma que não há entradas específicas de BSUID/username nesta página genérica)
- https://www.businesstoday.in/technology/news/story/whatsapp-username-rules-explained-allowed-characters-length-and-restrictions-you-need-to-know-539909-2026-06-30 (via busca, secundária — corrobora charset)
- https://techcrunch.com/2026/06/29/whatsapp-now-lets-you-reserve-usernames (via busca, secundária — corrobora data 29 jun 2026)
- https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform (via busca)
- https://developers.facebook.com/documentation/business-messaging/whatsapp/overview (via busca)
- https://www.twilio.com/en-us/changelog/whatsapp-usernames--new-business-scoped-user-id--bsuid--field-re (via busca, secundária)
- https://api.support.vonage.com/hc/en-us/articles/26938046521116-Understanding-WhatsApp-Usernames-and-Business-Scoped-User-IDs-BSUIDs-Required-Actions-and-Changes (via busca, secundária)
- https://www.infobip.com/docs/whatsapp/manage-integration/usernames-and-user-ids (via busca, secundária)
- https://docs.kapso.ai/docs/whatsapp/business-scoped-user-ids (via busca, secundária)
- https://learn.microsoft.com/en-us/azure/communication-services/concepts/advanced-messaging/whatsapp/whatsapp-username-support-overview (via busca, secundária)
- https://developer.zendesk.com/documentation/conversations/messaging-platform/programmable-conversations/whatsapp-bsuid-migration/ (via busca, secundária)
- https://github.com/chatwoot/chatwoot/issues/13837 (fetch direto)
- https://github.com/wwebjs/whatsapp-web.js/issues/201728 (via busca)
- https://github.com/WhiskeySockets/Baileys/issues/2516 (via busca)
- https://github.com/carboni123/maia-messaging/issues/4 (via busca)
- https://github.com/freescout-help-desk/freescout/issues/5224 (via busca)
- https://github.com/tyntec/api-collection/blob/master/conversations/v3/README.md (via busca)
- https://github.com/WhatsApp/WhatsApp-Nodejs-SDK (fetch direto)
- https://github.com/gokapso/whatsapp-cloud-api-js (fetch direto)
