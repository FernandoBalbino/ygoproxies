import type { YgoProCard, YgoProResponse } from "@/types/ygopro.types";

const YGOPRO_ENDPOINT = "https://db.ygoprodeck.com/api/v7/cardinfo.php";
const PORTUGUESE_CATALOG_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_SEARCH_RESULTS = 30;

let portugueseCatalogCache: { cards: YgoProCard[]; expiresAt: number } | null = null;
let portugueseCatalogRequest: Promise<YgoProCard[]> | null = null;

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

async function getPortugueseCatalog(): Promise<YgoProCard[]> {
  const now = Date.now();

  if (portugueseCatalogCache && portugueseCatalogCache.expiresAt > now) {
    return portugueseCatalogCache.cards;
  }

  portugueseCatalogRequest ??= requestCards(new URLSearchParams({ language: "pt" }))
    .then((cards) => {
      if (cards.length) {
        portugueseCatalogCache = {
          cards,
          expiresAt: Date.now() + PORTUGUESE_CATALOG_TTL_MS,
        };

        return cards;
      }

      return portugueseCatalogCache?.cards ?? [];
    })
    .finally(() => {
      portugueseCatalogRequest = null;
    });

  try {
    return await portugueseCatalogRequest;
  } catch {
    return portugueseCatalogCache?.cards ?? [];
  }
}

async function getPortugueseCatalogBestEffort(): Promise<YgoProCard[]> {
  try {
    return await getPortugueseCatalog();
  } catch {
    return [];
  }
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/["'`´’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function getSearchScore(card: YgoProCard, term: string, tokens: string[]): number {
  const names = [card.name, card.name_en].filter((value): value is string => Boolean(value));
  const normalizedNames = names.map(normalizeSearchValue);

  for (const name of normalizedNames) {
    if (name === term) return 0;
  }

  for (const name of normalizedNames) {
    if (name.startsWith(term)) return 1;
  }

  for (const name of normalizedNames) {
    if (name.includes(term)) return 2;
  }

  for (const name of normalizedNames) {
    if (tokens.every((token) => name.includes(token))) return 3;
  }

  return Number.POSITIVE_INFINITY;
}

function searchCachedPortugueseCards(cards: YgoProCard[], term: string): YgoProCard[] {
  const normalizedTerm = normalizeSearchValue(term);
  if (!normalizedTerm) {
    return [];
  }

  const tokens = normalizedTerm.split(" ").filter(Boolean);

  return cards
    .map((card) => ({
      card,
      score: getSearchScore(card, normalizedTerm, tokens),
    }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score;
      return left.card.name.localeCompare(right.card.name, "pt-BR");
    })
    .slice(0, MAX_SEARCH_RESULTS)
    .map(({ card }) => card);
}

async function getCachedPortugueseCardsByIds(cardIds: number[]): Promise<YgoProCard[]> {
  if (!cardIds.length) {
    return [];
  }

  const catalog = await getPortugueseCatalogBestEffort();
  if (!catalog.length) {
    return [];
  }

  const cardsById = new Map(catalog.map((card) => [card.id, card]));
  return cardIds.flatMap((cardId) => {
    const card = cardsById.get(cardId);
    return card ? [card] : [];
  });
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

  const cachedPortugueseCards = searchCachedPortugueseCards(await getPortugueseCatalogBestEffort(), term);

  const fallbackParams = new URLSearchParams({
    fname: term,
  });
  const fallbackCards = await requestCardsBestEffort(fallbackParams);
  const fallbackIds = fallbackCards.slice(0, MAX_SEARCH_RESULTS).map((card) => card.id);

  if (!fallbackIds.length) {
    return cachedPortugueseCards;
  }

  const localizedParams = new URLSearchParams({
    id: fallbackIds.join(","),
    language: "pt",
  });

  const localizedCards = await requestCardsBestEffort(localizedParams);
  const cachedCardsById = await getCachedPortugueseCardsByIds(fallbackIds);
  const portugueseCardsById = new Map(
    [...localizedCards, ...cachedCardsById].map((card) => [card.id, card]),
  );
  const mergedFallbackCards = fallbackCards
    .slice(0, MAX_SEARCH_RESULTS)
    .map((card) => portugueseCardsById.get(card.id) ?? card);
  const mergedIds = new Set(mergedFallbackCards.map((card) => card.id));
  const cachedOnlyCards = cachedPortugueseCards.filter((card) => !mergedIds.has(card.id));

  return [...mergedFallbackCards, ...cachedOnlyCards].slice(0, MAX_SEARCH_RESULTS);
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

    const cachedPortugueseCards = await getCachedPortugueseCardsByIds([cardId]);
    if (cachedPortugueseCards[0]) {
      return cachedPortugueseCards[0];
    }
  }

  const cards = await requestCards(englishParams);
  return cards[0] ?? null;
}
