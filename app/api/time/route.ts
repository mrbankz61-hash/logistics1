import { connection, NextResponse } from "next/server";

/** Server clock, so viewers with a wrong device clock still see the right position. */
export async function GET() {
  await connection();
  return NextResponse.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
