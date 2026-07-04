import { siteConfig } from "@/config/site";

export function buildShortLink(username: string): string {
  return `${siteConfig.url.replace(/\/+$/, "")}/${username}`;
}
