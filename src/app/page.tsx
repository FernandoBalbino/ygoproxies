"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CardPreview } from "@/components/CardPreview";
import { CardSearchResults } from "@/components/CardSearchResults";
import { DeckDock } from "@/components/DeckDock";
import { GeneratePdfButton } from "@/components/GeneratePdfButton";
import { MercadoPagoFrontendSdk } from "@/components/MercadoPagoFrontendSdk";
import { SearchCardForm } from "@/components/SearchCardForm";
import { SearchHintModal } from "@/components/SearchHintModal";
import type { DeckType, NormalizedCard, RenderedCard } from "@/types/card.types";
import type { DeckCard, DeckState } from "@/types/deck.types";

const MAX_CARD_COPIES = 3;
const DECK_STORAGE_KEY = "ygoproxies.deck.v1";

function createInstanceId(cardId: number): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${cardId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeCardQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.min(MAX_CARD_COPIES, Math.max(1, Math.trunc(quantity)));
}

function isSameDeckCard(card: DeckCard, renderedCard: RenderedCard, renderLanguage: "pt" | "en"): boolean {
  return card.id === renderedCard.id && (card.renderLanguage ?? "pt") === renderLanguage;
}

function expandDeckCards(cards: DeckCard[]): DeckCard[] {
  return cards.flatMap((card) =>
    Array.from({ length: card.quantity }, (_, index) => ({
      ...card,
      instanceId: `${card.instanceId}-${index + 1}`,
    })),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeStoredDeckCard(value: unknown, deckType: DeckType): DeckCard | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "number" ? value.id : Number(value.id);
  const name = typeof value.name === "string" ? value.name : "";
  const renderedImageDataUrl = typeof value.renderedImageDataUrl === "string" ? value.renderedImageDataUrl : "";

  if (!Number.isFinite(id) || !name || !renderedImageDataUrl) {
    return null;
  }

  const storedLanguage = value.renderLanguage === "en" || value.renderLanguage === "pt"
    ? value.renderLanguage
    : undefined;

  return {
    ...(value as unknown as DeckCard),
    id,
    name,
    deckType,
    instanceId: typeof value.instanceId === "string" ? value.instanceId : createInstanceId(id),
    quantity: normalizeCardQuantity(Number(value.quantity ?? 1)),
    renderedImageDataUrl,
    renderLanguage: storedLanguage,
  };
}

function normalizeStoredDeck(value: unknown): DeckState | null {
  if (!isRecord(value)) {
    return null;
  }

  const main = Array.isArray(value.main)
    ? value.main.map((card) => normalizeStoredDeckCard(card, "main")).filter((card): card is DeckCard => Boolean(card))
    : [];
  const extra = Array.isArray(value.extra)
    ? value.extra.map((card) => normalizeStoredDeckCard(card, "extra")).filter((card): card is DeckCard => Boolean(card))
    : [];

  return { main, extra };
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"pt" | "en">("pt");
  const [results, setResults] = useState<NormalizedCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<NormalizedCard | null>(null);
  const [renderedCard, setRenderedCard] = useState<RenderedCard | null>(null);
  const [deck, setDeck] = useState<DeckState>({ main: [], extra: [] });
  const [activeDeck, setActiveDeck] = useState<DeckType | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [hasLoadedStoredDeck, setHasLoadedStoredDeck] = useState(false);
  const [error, setError] = useState("");

  const allDeckCards = useMemo(() => expandDeckCards([...deck.main, ...deck.extra]), [deck]);
  const closeDeck = useCallback(() => setActiveDeck(null), []);

  useEffect(() => {
    try {
      const storedDeck = window.localStorage.getItem(DECK_STORAGE_KEY);
      if (!storedDeck) {
        return;
      }

      const parsedDeck = normalizeStoredDeck(JSON.parse(storedDeck));
      if (parsedDeck) {
        setDeck(parsedDeck);
      }
    } catch {
      window.localStorage.removeItem(DECK_STORAGE_KEY);
    } finally {
      setHasLoadedStoredDeck(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredDeck) {
      return;
    }

    try {
      if (deck.main.length || deck.extra.length) {
        window.localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(deck));
      } else {
        window.localStorage.removeItem(DECK_STORAGE_KEY);
      }
    } catch {
      // The deck still works in memory if localStorage is full or unavailable.
    }
  }, [deck, hasLoadedStoredDeck]);

  async function handleSearch() {
    const term = query.trim();
    if (!term) {
      setError("Digite o nome de uma carta.");
      return;
    }

    setIsSearching(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch(`/api/search-card?name=${encodeURIComponent(term)}&language=${language}`);
      const payload = (await response.json()) as { cards?: NormalizedCard[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao buscar cartas.");
      }

      setResults(payload.cards ?? []);
      if (!payload.cards?.length) {
        setError("Carta não encontrada.");
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Falha ao buscar cartas.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSelectCard(card: NormalizedCard) {
    setSelectedCard(card);
    setRenderedCard(null);
    setError("");

    if (!card.isSupported) {
      setError(card.unsupportedReason ?? "Este tipo de carta ainda não é suportado.");
      return;
    }

    setIsRendering(true);
    try {
      const response = await fetch("/api/generate-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cardId: card.id, language }),
      });
      const payload = (await response.json()) as { card?: RenderedCard; error?: string };

      if (!response.ok || !payload.card) {
        throw new Error(payload.error ?? "Falha ao gerar a carta.");
      }

      setSelectedCard(payload.card);
      setRenderedCard(payload.card);
    } catch (renderError) {
      setError(renderError instanceof Error ? renderError.message : "Falha ao gerar a carta.");
    } finally {
      setIsRendering(false);
    }
  }

  function handleAddToDeck(quantity: number) {
    if (!renderedCard?.deckType) {
      return;
    }

    const deckType = renderedCard.deckType;
    const requestedQuantity = normalizeCardQuantity(quantity);
    const existingQuantity = deck[deckType].find((card) => isSameDeckCard(card, renderedCard, language))?.quantity ?? 0;

    if (existingQuantity >= MAX_CARD_COPIES) {
      setError("Esta carta ja esta com 3 copias no deck.");
      return;
    }

    const instanceId = createInstanceId(renderedCard.id);
    setError("");

    setDeck((current) => {
      const currentDeck = current[deckType];
      const existingCard = currentDeck.find((card) => isSameDeckCard(card, renderedCard, language));
      const availableCopies = MAX_CARD_COPIES - (existingCard?.quantity ?? 0);
      const quantityToAdd = Math.min(requestedQuantity, availableCopies);

      if (quantityToAdd <= 0) {
        return current;
      }

      if (existingCard) {
        return {
          ...current,
          [deckType]: currentDeck.map((card) =>
            card.instanceId === existingCard.instanceId
              ? { ...card, ...renderedCard, deckType, renderLanguage: language, quantity: card.quantity + quantityToAdd }
              : card,
          ),
        };
      }

      const deckCard: DeckCard = {
        ...renderedCard,
        deckType,
        instanceId,
        quantity: quantityToAdd,
        renderLanguage: language,
      };

      return {
        ...current,
        [deckType]: [...currentDeck, deckCard],
      };
    });
  }

  function handleRemoveCard(instanceId: string) {
    setDeck((current) => ({
      main: current.main.filter((card) => card.instanceId !== instanceId),
      extra: current.extra.filter((card) => card.instanceId !== instanceId),
    }));
  }

  return (
    <>
      <SearchHintModal />

      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-5 px-3 py-4 pb-32 sm:max-w-2xl sm:px-5 sm:py-5 md:max-w-4xl md:pb-36">
        <MercadoPagoFrontendSdk />

        <header className="flex min-w-0 items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-normal text-red-800">Yu-Gi-Oh!</p>
            <h1 className="truncate text-3xl font-black tracking-normal text-stone-950 sm:text-4xl">YGO Proxies</h1>
          </div>
          <div className="shrink-0 rounded-lg bg-stone-950 px-3 py-2 text-right text-white">
            <p className="text-xs font-bold text-stone-300">Total</p>
            <p className="text-xl font-black">{allDeckCards.length}</p>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] md:items-start">
          <div className="grid min-w-0 gap-5">
            <SearchCardForm
              query={query}
              language={language}
              isLoading={isSearching}
              onQueryChange={setQuery}
              onLanguageChange={setLanguage}
              onSearch={handleSearch}
            />

            {error ? (
              <div className="wrap-anywhere rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold leading-snug text-red-800">
                {error}
              </div>
            ) : null}

            <CardSearchResults
              cards={results}
              selectedCardId={selectedCard?.id}
              isLoading={isSearching}
              onSelectCard={handleSelectCard}
            />
          </div>

          <div className="grid min-w-0 gap-5 md:sticky md:top-5">
            <CardPreview
              selectedCard={selectedCard}
              renderedCard={renderedCard}
              isRendering={isRendering}
              maxQuantity={MAX_CARD_COPIES}
              onAddToDeck={handleAddToDeck}
            />

            <GeneratePdfButton cards={allDeckCards} onError={setError} />
          </div>
        </section>
      </main>

      <DeckDock
        deck={deck}
        activeDeck={activeDeck}
        onOpenDeck={setActiveDeck}
        onCloseDeck={closeDeck}
        onRemoveCard={handleRemoveCard}
      />
    </>
  );
}
