import type { NormalizedEvent, WebhookAdapter } from "../types";

interface MetaContact {
  wa_id?: string;
  user_id?: string;
  profile?: { name?: string; username?: string };
}

interface MetaMessage {
  from?: string;
  from_user_id?: string;
}

interface MetaStatus {
  recipient_id?: string;
  recipient_user_id?: string;
}

interface MetaValue {
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
}

function extractValues(raw: unknown): MetaValue[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;

  if (Array.isArray(obj.entry)) {
    return (obj.entry as Record<string, unknown>[]).flatMap((entry) => {
      const changes = Array.isArray(entry.changes) ? (entry.changes as Record<string, unknown>[]) : [];
      return changes.map((change) => (change.value ?? {}) as MetaValue);
    });
  }

  if (Array.isArray(obj.contacts) || Array.isArray(obj.messages) || Array.isArray(obj.statuses)) {
    return [obj as MetaValue];
  }

  return [];
}

function findContact(contacts: MetaContact[], waId?: string, userId?: string): MetaContact | undefined {
  return contacts.find((c) => (waId && c.wa_id === waId) || (userId && c.user_id === userId));
}

export const metaCloudApiAdapter: WebhookAdapter = {
  recognizes(raw) {
    return extractValues(raw).length > 0;
  },

  normalize(raw) {
    const events: NormalizedEvent[] = [];

    for (const value of extractValues(raw)) {
      const contacts = value.contacts ?? [];

      for (const message of value.messages ?? []) {
        const contact = findContact(contacts, message.from, message.from_user_id);
        events.push({
          kind: "message",
          bsuid: message.from_user_id ?? null,
          phone: message.from ?? null,
          username: contact?.profile?.username ?? null,
          displayName: contact?.profile?.name ?? null,
          raw: message,
        });
      }

      for (const status of value.statuses ?? []) {
        const contact = findContact(contacts, status.recipient_id, status.recipient_user_id);
        events.push({
          kind: "status",
          bsuid: status.recipient_user_id ?? null,
          phone: status.recipient_id ?? null,
          username: contact?.profile?.username ?? null,
          displayName: contact?.profile?.name ?? null,
          raw: status,
        });
      }
    }

    return events;
  },
};
