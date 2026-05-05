import type { DeckType } from "@/types/card.types";

export const UNSUPPORTED_CARD_MESSAGE = "Este tipo de carta ainda não é suportado.";

const MAIN_DECK_FRAMES = new Set(["normal", "effect", "ritual", "spell", "trap"]);
const EXTRA_DECK_FRAMES = new Set(["fusion", "synchro", "xyz", "link"]);

export function getUnsupportedReason(type: string, frameType: string): string | undefined {
  const typeText = type.toLowerCase();
  const frame = frameType.toLowerCase();

  if (frame.includes("pendulum") || typeText.includes("pendulum") || typeText.includes("pêndulo")) {
    return UNSUPPORTED_CARD_MESSAGE;
  }

  if (!MAIN_DECK_FRAMES.has(frame) && !EXTRA_DECK_FRAMES.has(frame)) {
    return UNSUPPORTED_CARD_MESSAGE;
  }

  return undefined;
}

export function getDeckType(type: string, frameType: string): DeckType {
  const unsupported = getUnsupportedReason(type, frameType);
  if (unsupported) {
    throw new Error(unsupported);
  }

  const frame = frameType.toLowerCase();
  if (EXTRA_DECK_FRAMES.has(frame)) {
    return "extra";
  }

  return "main";
}
