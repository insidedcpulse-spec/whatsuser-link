export type NormalizedEventKind = "message" | "status";

export interface NormalizedEvent {
  kind: NormalizedEventKind;
  bsuid: string | null;
  phone: string | null;
  username: string | null;
  displayName: string | null;
  raw: unknown;
}

export interface NormalizedWebhook {
  provider: "meta_cloud_api";
  events: NormalizedEvent[];
}

export interface WebhookAdapter {
  recognizes(raw: unknown): boolean;
  normalize(raw: unknown): NormalizedEvent[];
}
