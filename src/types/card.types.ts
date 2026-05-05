export type SupportedFrameType =
  | "normal"
  | "effect"
  | "ritual"
  | "fusion"
  | "synchro"
  | "xyz"
  | "link"
  | "spell"
  | "trap";

export type DeckType = "main" | "extra";

export interface NormalizedCard {
  id: number;
  imageId: number;
  name: string;
  originalName?: string;
  desc: string;
  pendulumDescription?: string;
  type: string;
  humanReadableCardType: string;
  frameType: string;
  race?: string;
  typeline: string[];
  atk?: number | null;
  def?: number | null;
  level?: number | null;
  pendulumScale?: number | null;
  attribute?: string | null;
  linkval?: number | null;
  linkmarkers?: string[];
  croppedImageUrl: string;
  fullImageUrl?: string;
  templatePath?: string;
  attributeIconPath?: string;
  subfamilyIconPath?: string;
  deckType?: DeckType;
  isSupported: boolean;
  unsupportedReason?: string;
}

export interface RenderedCard extends NormalizedCard {
  renderedImagePath?: string;
  renderedImageDataUrl: string;
}
