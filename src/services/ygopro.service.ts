import type { YgoProCard, YgoProResponse } from "@/types/ygopro.types";

const YGOPRO_ENDPOINT = "https://db.ygoprodeck.com/api/v7/cardinfo.php";

export class YgoProServiceError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "YgoProServiceError";
  }
}

async function requestCards(params: URLSearchParams): Promise<YgoProCard[]> {
  const response = await fetch(`${YGOPRO_ENDPOINT}?${params.toString()}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = (await response.json().catch(() => ({}))) as YgoProResponse;

  if (response.status === 400 || response.status === 404 || payload.error) {
    return [];
  }

  if (!response.ok) {
    throw new YgoProServiceError("A API do YGOPRODeck não respondeu corretamente.", response.status);
  }

  return payload.data ?? [];
}

async function requestCardsBestEffort(params: URLSearchParams): Promise<YgoProCard[]> {
  try {
    return await requestCards(params);
  } catch {
    return [];
  }
}

export async function searchCardsByName(name: string, language: "pt" | "en" = "pt"): Promise<YgoProCard[]> {
  const term = name.trim();
  if (!term) {
    return [];
  }

  if (language === "en") {
    const params = new URLSearchParams({ fname: term });
    return requestCards(params);
  }

  const portugueseParams = new URLSearchParams({
    fname: term,
    language: "pt",
  });

  const portugueseCards = await requestCardsBestEffort(portugueseParams);
  if (portugueseCards.length) {
    return portugueseCards;
  }

  const fallbackParams = new URLSearchParams({
    fname: term,
  });
  const fallbackCards = await requestCards(fallbackParams);
  const fallbackIds = fallbackCards.slice(0, 30).map((card) => card.id);

  if (!fallbackIds.length) {
    return [];
  }

  const localizedParams = new URLSearchParams({
    id: fallbackIds.join(","),
    language: "pt",
  });

  const localizedCards = await requestCardsBestEffort(localizedParams);
  return localizedCards.length ? localizedCards : fallbackCards.slice(0, 30);
}

export async function getCardById(cardId: number, language: "pt" | "en" = "pt"): Promise<YgoProCard | null> {
  const englishParams = new URLSearchParams({
    id: String(cardId),
  });
  
  if (language === "pt") {
    const portugueseParams = new URLSearchParams(englishParams);
    portugueseParams.set("language", "pt");
    const portugueseCards = await requestCardsBestEffort(portugueseParams);
    if (portugueseCards[0]) {
      return portugueseCards[0];
    }
  }

  const cards = await requestCards(englishParams);
  return cards[0] ?? null;
}
