export const CONSENT_KEY = "cookie-consent";
export const CONSENT_EVENT = "consent-change";
export const OPEN_SETTINGS_EVENT = "open-cookie-settings";
export const CONSENT_VERSION = 1;
/** Re-ask after ~6 months (CNIL recommendation). */
export const CONSENT_MAX_AGE_MS = 180 * 24 * 3600 * 1000;

export interface ConsentChoice {
  version: number;
  ads: boolean;
  timestamp: number;
}

export function parseConsent(raw: string | null, now = Date.now()): ConsentChoice | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ConsentChoice>;
    if (
      value.version !== CONSENT_VERSION ||
      typeof value.ads !== "boolean" ||
      typeof value.timestamp !== "number" ||
      now - value.timestamp > CONSENT_MAX_AGE_MS
    ) {
      return null;
    }
    return { version: value.version, ads: value.ads, timestamp: value.timestamp };
  } catch {
    return null;
  }
}

export function readConsent(): ConsentChoice | null {
  try {
    return parseConsent(localStorage.getItem(CONSENT_KEY));
  } catch {
    return null;
  }
}

export function saveConsent(ads: boolean): ConsentChoice {
  const choice: ConsentChoice = { version: CONSENT_VERSION, ads, timestamp: Date.now() };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(choice));
  } catch {}
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
  return choice;
}
