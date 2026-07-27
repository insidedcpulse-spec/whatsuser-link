import { GET as getRss } from "@/app/rss.xml/route";

export async function GET(): Promise<Response> {
  return getRss();
}
