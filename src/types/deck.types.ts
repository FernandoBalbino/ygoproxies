import type { DeckType, RenderedCard } from "@/types/card.types";

export interface DeckCard extends RenderedCard {
  instanceId: string;
  deckType: DeckType;
  renderLanguage?: "pt" | "en";
}

export interface DeckState {
  main: DeckCard[];
  extra: DeckCard[];
}
