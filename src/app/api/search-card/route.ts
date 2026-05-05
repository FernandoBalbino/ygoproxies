import { NextRequest, NextResponse } from "next/server";
import { normalizeCardData } from "@/services/card-normalizer.service";
import { searchCardsByName } from "@/services/ygopro.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();
  const language = (request.nextUrl.searchParams.get("language") as "pt" | "en") || "pt";

  if (!name) {
    return NextResponse.json({ error: "Digite o nome de uma carta." }, { status: 400 });
  }

  try {
    const cards = await searchCardsByName(name, language);
    return NextResponse.json({
      cards: cards.slice(0, 30).map(card => normalizeCardData(card, language)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar a API.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
