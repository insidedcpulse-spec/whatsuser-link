import { metaCloudApiAdapter } from "./adapters/meta-cloud-api";
import type { NormalizedWebhook } from "./types";

export function normalizeWebhook(raw: unknown): NormalizedWebhook | null {
  if (!metaCloudApiAdapter.recognizes(raw)) return null;
  return { provider: "meta_cloud_api", events: metaCloudApiAdapter.normalize(raw) };
}
