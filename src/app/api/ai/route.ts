import { NextResponse } from "next/server";
import { parseAiRequest, runAiTask } from "@/lib/ai/gateway";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const payload = parseAiRequest(body);

  if (!payload) {
    return NextResponse.json({ error: "Invalid AI request payload" }, { status: 400 });
  }

  try {
    const result = await runAiTask(payload);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "AI task failed" }, { status: 502 });
  }
}
