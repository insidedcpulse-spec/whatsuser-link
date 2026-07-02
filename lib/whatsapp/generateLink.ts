/**
 * ATENÇÃO: formato de link não oficial.
 *
 * A WhatsApp ainda não publicou uma especificação pública para abrir chats
 * por @username (equivalente ao `wa.me/<numero>` que já existe para números
 * de telefone). O formato usado aqui (`wa.me/u/<username>`) é uma aposta
 * baseada no padrão existente e pode precisar de ajuste assim que a WhatsApp
 * confirmar a spec oficial.
 *
 * Esta é a ÚNICA função em todo o projeto que constrói o URL do WhatsApp.
 * Quando a WhatsApp publicar o formato real, esta é a única alteração
 * necessária — nenhum outro módulo deve assumir este formato.
 */
export function generateWhatsAppLink(username: string, message?: string): string {
  const baseUrl = `https://wa.me/u/${username}`;

  if (!message || message.trim().length === 0) {
    return baseUrl;
  }

  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}
