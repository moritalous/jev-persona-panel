import { NextResponse } from "next/server";
import { judge } from "@/lib/jev";

// SDK が Node.js 20 以上を要求するため、Edge ランタイムでは動かさない。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel の関数実行時間の上限（プランにより異なる）
export const maxDuration = 60;

const MAX_IDEA_LENGTH = 4000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です。" },
      { status: 400 },
    );
  }

  const idea =
    typeof body === "object" && body !== null && "idea" in body
      ? String((body as { idea: unknown }).idea ?? "").trim()
      : "";

  if (!idea) {
    return NextResponse.json(
      { error: "新規事業のアイデアを入力してください。" },
      { status: 400 },
    );
  }

  if (idea.length > MAX_IDEA_LENGTH) {
    return NextResponse.json(
      { error: `アイデアは${MAX_IDEA_LENGTH}文字以内で入力してください。` },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await judge(idea));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "判定に失敗しました。";
    console.error("[judge] failed:", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
