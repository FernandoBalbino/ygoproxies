"use client";

import { useMemo, useState } from "react";
import { CardPreview } from "@/components/CardPreview";
import { CardSearchResults } from "@/components/CardSearchResults";
import { DeckList } from "@/components/DeckList";
import { GeneratePdfButton } from "@/components/GeneratePdfButton";
import { SearchCardForm } from "@/components/SearchCardForm";
import type { NormalizedCard, RenderedCard } from "@/types/card.types";
import type { DeckCard, DeckState } from "@/types/deck.types";

function createInstanceId(cardId: number): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${cardId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"pt" | "en">("pt");
  const [results, setResults] = useState<NormalizedCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<NormalizedCard | null>(null);
  const [renderedCard, setRenderedCard] = useState<RenderedCard | null>(null);
  const [deck, setDeck] = useState<DeckState>({ main: [], extra: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState("");

  const allDeckCards = useMemo(() => [...deck.main, ...deck.extra], [deck]);

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

  function handleAddToDeck() {
    if (!renderedCard?.deckType) {
      return;
    }

    const deckCard: DeckCard = {
      ...renderedCard,
      deckType: renderedCard.deckType,
      instanceId: createInstanceId(renderedCard.id),
    };

    setDeck((current) => ({
      ...current,
      [deckCard.deckType]: [...current[deckCard.deckType], deckCard],
    }));
  }

  function handleRemoveCard(instanceId: string) {
    setDeck((current) => ({
      main: current.main.filter((card) => card.instanceId !== instanceId),
      extra: current.extra.filter((card) => card.instanceId !== instanceId),
    }));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-4 py-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-normal text-red-800">Yu-Gi-Oh!</p>
          <h1 className="text-3xl font-black tracking-normal text-stone-950">YGO Proxies</h1>
        </div>
        <div className="rounded-lg bg-stone-950 px-3 py-2 text-right text-white">
          <p className="text-xs font-bold text-stone-300">Total</p>
          <p className="text-xl font-black">{allDeckCards.length}</p>
        </div>
      </header>

      <SearchCardForm 
        query={query} 
        language={language}
        isLoading={isSearching} 
        onQueryChange={setQuery} 
        onLanguageChange={setLanguage}
        onSearch={handleSearch} 
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
          {error}
        </div>
      ) : null}

      <CardSearchResults
        cards={results}
        selectedCardId={selectedCard?.id}
        isLoading={isSearching}
        onSelectCard={handleSelectCard}
      />

      <CardPreview
        selectedCard={selectedCard}
        renderedCard={renderedCard}
        isRendering={isRendering}
        onAddToDeck={handleAddToDeck}
      />

      <GeneratePdfButton cards={allDeckCards} onError={setError} />

      <div className="grid gap-5 pb-8">
        <DeckList title="Deck Principal" cards={deck.main} onRemoveCard={handleRemoveCard} />
        <DeckList title="Extra Deck" cards={deck.extra} onRemoveCard={handleRemoveCard} />
      </div>
    </main>
  );
}
