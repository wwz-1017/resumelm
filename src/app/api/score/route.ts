import { NextResponse } from "next/server";
import { parseScoreRequest, runScore } from "@/lib/scoring/gateway";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const payload = parseScoreRequest(body);

  if (!payload) {
    return NextResponse.json({ error: "Invalid score request payload" }, { status: 400 });
  }

  return NextResponse.json(runScore(payload));
}
