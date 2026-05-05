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
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-normal text-stone-600">Resultados</h2>
        <span className="shrink-0 rounded-full bg-stone-200 px-2.5 py-1 text-xs font-black text-stone-700">{cards.length}</span>
      </div>
      <div className="grid gap-2">
        {cards.map((card) => {
          const isSelected = card.id === selectedCardId;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectCard(card)}
              className={`grid min-w-0 grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-3 rounded-lg border p-2 text-left transition active:scale-[0.99] ${
                isSelected
                  ? "border-emerald-800 bg-emerald-50"
                  : "border-stone-200 bg-white"
              }`}
            >
              <img
                src={card.croppedImageUrl || card.fullImageUrl || card.templatePath}
                alt={card.name}
                className="aspect-[59/86] h-auto w-[3.25rem] rounded bg-stone-100 object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="clamp-2 wrap-anywhere block text-sm font-black leading-snug text-stone-950">{card.name}</span>
                <span className="wrap-anywhere mt-0.5 block text-xs font-semibold leading-snug text-stone-600">{card.humanReadableCardType}</span>
                {!card.isSupported ? (
                  <span className="wrap-anywhere mt-1 block text-xs font-bold leading-snug text-red-700">{card.unsupportedReason}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
