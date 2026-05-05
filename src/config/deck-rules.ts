import type { DeckType } from "@/types/card.types";

export const UNSUPPORTED_CARD_MESSAGE = "Este tipo de carta ainda não é suportado.";

const MAIN_DECK_FRAMES = new Set(["normal", "effect", "ritual", "spell", "trap"]);
const EXTRA_DECK_FRAMES = new Set(["fusion", "synchro", "xyz", "link"]);

function baseFrameType(frameType: string): string {
  const frame = frameType.toLowerCase();
  if (frame.endsWith("_pendulum")) {
    return frame.replace("_pendulum", "");
  }
  if (frame.startsWith("pendulum_")) {
    return frame.replace("pendulum_", "");
  }

  return frame;
}

export function getUnsupportedReason(_type: string, frameType: string): string | undefined {
  const frame = baseFrameType(frameType);

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

  const frame = baseFrameType(frameType);
  if (EXTRA_DECK_FRAMES.has(frame)) {
    return "extra";
  }

  return "main";
}
