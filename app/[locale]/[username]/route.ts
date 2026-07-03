import { NextResponse } from "next/server";
import { validateUsername } from "@/utils/validate-username";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const { valid } = validateUsername(username);

  if (!valid) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(`https://wa.me/u/${username}`, 307);
}
