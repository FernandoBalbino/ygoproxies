"use client";

import type { NormalizedCard } from "@/types/card.types";

interface CardSearchResultsProps {
  cards: NormalizedCard[];
  selectedCardId?: number;
  isLoading: boolean;
  onSelectCard: (card: NormalizedCard) => void;
}

export function CardSearchResults({ cards, selectedCardId, isLoading, onSelectCard }: CardSearchResultsProps) {
  if (isLoading) {
    return <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm font-semibold text-stone-600">Buscando...</div>;
  }

  if (!cards.length) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-black uppercase tracking-normal text-stone-600">Resultados</h2>
      <div className="grid gap-2">
        {cards.map((card) => {
          const isSelected = card.id === selectedCardId;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectCard(card)}
              className={`flex items-center gap-3 rounded-lg border p-2 text-left transition active:scale-[0.99] ${
                isSelected
                  ? "border-emerald-800 bg-emerald-50"
                  : "border-stone-200 bg-white"
              }`}
            >
              <img
                src={card.croppedImageUrl || card.fullImageUrl || card.templatePath}
                alt={card.name}
                className="h-16 w-11 shrink-0 rounded object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-stone-950">{card.name}</span>
                <span className="block truncate text-xs font-semibold text-stone-600">{card.humanReadableCardType}</span>
                {!card.isSupported ? (
                  <span className="mt-1 block truncate text-xs font-bold text-red-700">{card.unsupportedReason}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
