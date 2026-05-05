"use client";

import { Layers, Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { DeckList } from "@/components/DeckList";
import type { DeckType } from "@/types/card.types";
import type { DeckState } from "@/types/deck.types";

interface DeckDockProps {
  deck: DeckState;
  activeDeck: DeckType | null;
  onOpenDeck: (deckType: DeckType) => void;
  onCloseDeck: () => void;
  onRemoveCard: (instanceId: string) => void;
}

const DECK_LABELS: Record<DeckType, string> = {
  main: "Deck Principal",
  extra: "Extra Deck",
};

function DeckDockButton({
  deckType,
  count,
  onClick,
}: {
  deckType: DeckType;
  count: number;
  onClick: () => void;
}) {
  const Icon = deckType === "main" ? Layers : Sparkles;

  return (
    <button
      type="button"
      onClick={onClick}
      className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_2rem] items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-left shadow-card active:scale-[0.99]"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-stone-950 text-white">
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-black uppercase tracking-normal text-stone-500">
          {deckType === "main" ? "Principal" : "Extra"}
        </span>
        <span className="block truncate text-sm font-black text-stone-950">{DECK_LABELS[deckType]}</span>
      </span>
      <span className="grid h-8 w-8 place-items-center rounded-full bg-red-800 text-sm font-black text-white">
        {count}
      </span>
    </button>
  );
}

export function DeckDock({ deck, activeDeck, onOpenDeck, onCloseDeck, onRemoveCard }: DeckDockProps) {
  const activeCards = activeDeck ? deck[activeDeck] : [];
  const activeTitle = activeDeck ? DECK_LABELS[activeDeck] : "";

  useEffect(() => {
    if (!activeDeck) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseDeck();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDeck, onCloseDeck]);

  return (
    <>
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-stone-50/95 shadow-[0_-12px_30px_rgba(28,25,23,0.12)] backdrop-blur">
        <div className="mx-auto grid w-full max-w-xl grid-cols-2 gap-2 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:max-w-2xl sm:px-5 md:max-w-4xl">
          <DeckDockButton deckType="main" count={deck.main.length} onClick={() => onOpenDeck("main")} />
          <DeckDockButton deckType="extra" count={deck.extra.length} onClick={() => onOpenDeck("extra")} />
        </div>
      </footer>

      {activeDeck ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-stone-950/45"
            aria-label="Fechar deck"
            onClick={onCloseDeck}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="deck-modal-title"
            className="absolute inset-x-0 bottom-0 mx-auto max-h-[82dvh] w-full max-w-xl overflow-hidden rounded-t-lg border border-stone-200 bg-stone-50 shadow-[0_-20px_50px_rgba(28,25,23,0.28)] sm:bottom-6 sm:rounded-lg md:max-w-2xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-normal text-red-800">Cartas no deck</p>
                <h2 id="deck-modal-title" className="truncate text-lg font-black text-stone-950">{activeTitle}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-black text-white">{activeCards.length}</span>
                <button
                  type="button"
                  onClick={onCloseDeck}
                  className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-stone-200 text-stone-700 active:scale-[0.98]"
                  aria-label="Fechar"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </header>
            <div className="max-h-[calc(82dvh-4.5rem)] overflow-y-auto p-4">
              <DeckList title={activeTitle} cards={activeCards} showHeader={false} onRemoveCard={onRemoveCard} />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
