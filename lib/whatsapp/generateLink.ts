/**
 * Formato oficial confirmado pelo WhatsApp Help Center: wa.me/<username>
 * (sem prefixo /u/). Rollout do recurso de usernames é regional e faseado
 * (ver https://faq.whatsapp.com/425247423114725/).
 *
 * Esta é a ÚNICA função em todo o projeto que constrói o URL do WhatsApp.
 * Nenhum outro módulo deve assumir este formato.
 */
export function generateWhatsAppLink(username: string, message?: string): string {
  const baseUrl = `https://wa.me/${username}`;

  if (!message || message.trim().length === 0) {
    return baseUrl;
  }

  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}
