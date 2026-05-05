"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { NormalizedCard, RenderedCard } from "@/types/card.types";

interface CardPreviewProps {
  selectedCard?: NormalizedCard | null;
  renderedCard?: RenderedCard | null;
  isRendering: boolean;
  maxQuantity: number;
  onAddToDeck: (quantity: number) => void;
}

export function CardPreview({ selectedCard, renderedCard, isRendering, maxQuantity, onAddToDeck }: CardPreviewProps) {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setQuantity(1);
  }, [renderedCard?.id]);

  if (!selectedCard) {
    return null;
  }

  const targetDeck = renderedCard?.deckType === "extra" ? "Extra Deck" : "Deck Principal";
  const isAddDisabled = !renderedCard || isRendering;

  function handleQuantityChange(value: string) {
    const nextQuantity = Number(value);
    if (!Number.isFinite(nextQuantity)) {
      setQuantity(1);
      return;
    }

    setQuantity(Math.min(maxQuantity, Math.max(1, Math.trunc(nextQuantity))));
  }

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
          <div className="grid gap-2 sm:w-36">
            <button
              type="button"
              onClick={() => onAddToDeck(quantity)}
              disabled={isAddDisabled}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              <Plus size={18} />
              Adicionar
            </button>
            <label className="grid gap-1 text-xs font-black uppercase tracking-normal text-stone-500">
              Qtd. max. {maxQuantity}
              <input
                type="number"
                min={1}
                max={maxQuantity}
                step={1}
                inputMode="numeric"
                value={quantity}
                onChange={(event) => handleQuantityChange(event.target.value)}
                disabled={isAddDisabled}
                className="min-h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-center text-base font-black text-stone-950 outline-none focus:border-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
              />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
