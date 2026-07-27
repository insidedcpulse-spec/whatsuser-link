import { clearAdminSession } from "@/lib/auth";
import { apiJson } from "@/lib/api/responses";

export async function POST(): Promise<Response> {
  await clearAdminSession();
  return apiJson({ success: true });
}
