"use client";

import { Plus } from "lucide-react";
import type { NormalizedCard, RenderedCard } from "@/types/card.types";

interface CardPreviewProps {
  selectedCard?: NormalizedCard | null;
  renderedCard?: RenderedCard | null;
  isRendering: boolean;
  onAddToDeck: () => void;
}

export function CardPreview({ selectedCard, renderedCard, isRendering, onAddToDeck }: CardPreviewProps) {
  if (!selectedCard) {
    return null;
  }

  const targetDeck = renderedCard?.deckType === "extra" ? "Extra Deck" : "Deck Principal";

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-black uppercase tracking-normal text-stone-600">Preview</h2>
      <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-card">
        <div className="mx-auto aspect-[59/86] w-full max-w-[300px] overflow-hidden rounded-md bg-stone-100">
          {renderedCard ? (
            <img
              src={renderedCard.renderedImageDataUrl}
              alt={renderedCard.name}
              className="h-full w-full object-fill"
            />
          ) : (
            <div className="grid h-full place-items-center px-5 text-center text-sm font-bold text-stone-500">
              {isRendering ? "Montando carta..." : selectedCard.unsupportedReason ?? selectedCard.name}
            </div>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="clamp-2 wrap-anywhere text-base font-black leading-snug text-stone-950">{selectedCard.name}</p>
            <p className="text-sm font-semibold text-stone-600">{targetDeck}</p>
          </div>
          <button
            type="button"
            onClick={onAddToDeck}
            disabled={!renderedCard || isRendering}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-stone-400 sm:w-auto"
          >
            <Plus size={18} />
            Adicionar
          </button>
        </div>
      </div>
    </section>
  );
}
