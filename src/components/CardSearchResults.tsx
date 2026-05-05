"use client";

import type { NormalizedCard } from "@/types/card.types";

interface CardSearchResultsProps {
  cards: NormalizedCard[];
  selectedCardId?: number;
  isLoading: boolean;
  onSelectCard: (card: NormalizedCard) => void;
}

function CardBackSkeleton() {
  return (
    <section
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-lg border border-amber-900/20 bg-white p-3 shadow-card"
    >
      <div className="grid min-w-0 grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-3">
        <div className="ygo-card-back-loader aspect-[59/86] w-[4.25rem] rounded-md" aria-hidden="true">
          <svg viewBox="0 0 118 172" className="h-full w-full" aria-hidden="true">
            <defs>
              <radialGradient id="card-back-core" cx="50%" cy="50%" r="56%">
                <stop offset="0%" stopColor="#050403" />
                <stop offset="48%" stopColor="#110b09" />
                <stop offset="72%" stopColor="#60240d" />
                <stop offset="100%" stopColor="#f08a1f" />
              </radialGradient>
              <linearGradient id="card-back-edge" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8b24a" />
                <stop offset="50%" stopColor="#5c1f0d" />
                <stop offset="100%" stopColor="#f0a12d" />
              </linearGradient>
            </defs>
            <rect x="3" y="3" width="112" height="166" rx="7" fill="#160b08" stroke="url(#card-back-edge)" strokeWidth="5" />
            <rect x="10" y="10" width="98" height="152" rx="4" fill="url(#card-back-core)" />
            <g className="ygo-card-back-swirl" fill="none" strokeLinecap="round">
              {Array.from({ length: 12 }, (_, index) => (
                <ellipse
                  key={index}
                  cx="59"
                  cy="86"
                  rx={18 + index * 2.7}
                  ry={34 + index * 3.9}
                  stroke={index % 2 ? "#f58a1f" : "#5b2bff"}
                  strokeOpacity={0.26 + index * 0.035}
                  strokeWidth={index % 3 === 0 ? 2.1 : 1.25}
                  transform={`rotate(${index * 17} 59 86)`}
                />
              ))}
            </g>
            <ellipse cx="59" cy="86" rx="25" ry="39" fill="#030303" opacity="0.88" />
            <path
              className="ygo-card-back-spark"
              d="M23 38 C42 18 76 20 94 43 M25 135 C43 154 78 152 95 130"
              fill="none"
              stroke="#ffb64b"
              strokeLinecap="round"
              strokeWidth="2.4"
              opacity="0.75"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-stone-950">Buscando carta...</p>
          <div className="mt-2 grid gap-2" aria-hidden="true">
            <span className="h-3 w-full max-w-[15rem] rounded-full bg-stone-200 ygo-search-shimmer" />
            <span className="h-3 w-4/5 rounded-full bg-stone-200 ygo-search-shimmer" />
            <span className="h-3 w-2/3 rounded-full bg-stone-200 ygo-search-shimmer" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function CardSearchResults({ cards, selectedCardId, isLoading, onSelectCard }: CardSearchResultsProps) {
  if (isLoading) {
    return <CardBackSkeleton />;
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
