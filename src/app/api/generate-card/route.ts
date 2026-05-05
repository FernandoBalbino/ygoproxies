import { NextResponse } from "next/server";
import { DEFAULT_CARD_LAYOUT } from "@/config/card-layout";
import { normalizeCardData } from "@/services/card-normalizer.service";
import { downloadCardImage } from "@/services/image-cache.service";
import { renderCardImage } from "@/services/card-renderer.service";
import { getCardById } from "@/services/ygopro.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { cardId?: number; language?: "pt" | "en" };
    const language = body.language || "pt";

    if (!body.cardId) {
      return NextResponse.json({ error: "Carta nao informada." }, { status: 400 });
    }

    const apiCard = await getCardById(body.cardId, language);
    if (!apiCard) {
      return NextResponse.json({ error: "Carta nao encontrada." }, { status: 404 });
    }

    const card = normalizeCardData(apiCard, language);
    if (!card.isSupported) {
      return NextResponse.json({ error: card.unsupportedReason }, { status: 422 });
    }

    const sourceImageBuffer = await downloadCardImage(card.croppedImageUrl);
    const renderedCard = await renderCardImage(
      card,
      sourceImageBuffer,
      DEFAULT_CARD_LAYOUT,
    );

    return NextResponse.json({ card: renderedCard });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar a carta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
