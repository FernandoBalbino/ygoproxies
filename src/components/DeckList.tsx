"use client";

import { X } from "lucide-react";
import type { DeckCard } from "@/types/deck.types";

interface DeckListProps {
  title: string;
  cards: DeckCard[];
  showHeader?: boolean;
  onRemoveCard: (instanceId: string) => void;
}

export function DeckList({ title, cards, showHeader = true, onRemoveCard }: DeckListProps) {
  const cardCount = cards.reduce((total, card) => total + card.quantity, 0);

  return (
    <section className="space-y-3">
      {showHeader ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-normal text-stone-600">{title}</h2>
          <span className="shrink-0 rounded-full bg-stone-950 px-3 py-1 text-xs font-black text-white">{cardCount}</span>
        </div>
      ) : null}
      <div className="grid gap-2">
        {cards.length ? (
          cards.map((card) => (
            <div key={card.instanceId} className="grid min-w-0 grid-cols-[3.25rem_minmax(0,1fr)_2.25rem_2.75rem] items-center gap-2 rounded-lg border border-stone-200 bg-white p-2 sm:gap-3">
              <img
                src={card.renderedImageDataUrl}
                alt={card.name}
                className="aspect-[59/86] h-auto w-[3.25rem] rounded bg-stone-100 object-fill"
              />
              <div className="min-w-0 flex-1">
                <p className="clamp-2 wrap-anywhere text-sm font-black leading-snug text-stone-950">{card.name}</p>
                <p className="wrap-anywhere mt-0.5 text-xs font-semibold leading-snug text-stone-500">{card.humanReadableCardType}</p>
              </div>
              <span
                className="grid h-9 min-w-9 place-items-center rounded-lg bg-stone-100 px-2 text-sm font-black text-stone-950"
                aria-label={`${card.quantity} copias`}
                title={`${card.quantity} copias`}
              >
                {card.quantity}
              </span>
              <button
                type="button"
                onClick={() => onRemoveCard(card.instanceId)}
                className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-stone-200 text-red-700 active:scale-[0.98]"
                aria-label={`Remover ${card.name}`}
                title="Remover"
              >
                <X size={18} />
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white/70 p-4 text-sm font-semibold text-stone-500">0 cartas</div>
        )}
      </div>
    </section>
  );
}
