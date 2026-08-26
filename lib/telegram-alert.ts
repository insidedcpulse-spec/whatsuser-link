import type { Redis } from "@upstash/redis";

export interface TelegramBurstAlertOptions {
  clientId: string;
  endpoint: string;
  hourlyRequests: number;
  threshold: number;
  timestamp?: string;
}

export async function sendTelegramBurstAlert(options: TelegramBurstAlertOptions): Promise<boolean> {
  const token = process.env.TELEGRAM_ALERT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID || process.env.ALLOWED_USER_ID || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return false;
  }

  const shortClientId = options.clientId.length > 12 
    ? `${options.clientId.slice(0, 8)}...${options.clientId.slice(-4)}`
    : options.clientId;

  const dateStr = options.timestamp || new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const estimatedRedisCommands = options.hourlyRequests * 6;

  const text = [
    "🚨 <b>[WhatsUsernames] Alerta de Pico de Tráfego API</b>",
    "",
    "⚠️ <b>Limiar de requisições por hora ultrapassado!</b>",
    "",
    `• <b>Client ID:</b> <code>${shortClientId}</code>`,
    `• <b>Volume Horário:</b> <b>${options.hourlyRequests} reqs/h</b> (Limiar: ${options.threshold})`,
    `• <b>Endpoint:</b> <code>${options.endpoint}</code>`,
    `• <b>Impacto Estimado Redis:</b> ~ ${estimatedRedisCommands.toLocaleString()} comandos`,
    `• <b>Data/Hora:</b> <code>${dateStr}</code>`,
    "",
    "<i>Monitorização de Tráfego &amp; Proteção de Faturação Upstash Redis</i>",
  ].join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("[telegram-alert] Telegram API responded with error:", res.status, errText);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[telegram-alert] Failed to send Telegram alert:", error);
    return false;
  }
}

export type AlertRedisClient = {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<unknown>;
  set: (key: string, value: unknown, options?: unknown) => Promise<unknown>;
} | Redis;

export async function checkAndTriggerBurstAlert(
  redis: AlertRedisClient,
  clientId: string,
  endpoint: string
): Promise<boolean> {
  try {
    const threshold = parseInt(process.env.API_HOURLY_ALERT_THRESHOLD || "200", 10);
    const hourKey = new Date().toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
    const hourlyStatsKey = `stats:client:${clientId}:hour:${hourKey}`;

    const hourlyCount = await (redis as { incr: (key: string) => Promise<number> }).incr(hourlyStatsKey);
    if (hourlyCount === 1) {
      // 2 hours expiration to self-clean Redis
      await (redis as { expire: (key: string, seconds: number) => Promise<unknown> }).expire(hourlyStatsKey, 7200);
    }

    if (hourlyCount >= threshold) {
      const alertSentKey = `stats:alert:sent:${clientId}:${hourKey}`;
      // Use SET with NX and EX to guarantee single alert per client per hour
      const claimed = await (redis as Redis).set(alertSentKey, "1", { nx: true, ex: 3600 });
      if (claimed === "OK" || (claimed as unknown) === true) {
        // Fire alert in background (non-blocking)
        void sendTelegramBurstAlert({
          clientId,
          endpoint,
          hourlyRequests: hourlyCount,
          threshold,
        });
        return true;
      }
    }
    return false;
  } catch (error) {
    console.warn("[telegram-alert] checkAndTriggerBurstAlert failed:", error);
    return false;
  }
}
