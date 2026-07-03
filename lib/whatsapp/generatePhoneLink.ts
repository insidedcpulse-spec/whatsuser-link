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

  return `${baseUrl}?text=${encodeURIComponent(message.trim())}`;
}
