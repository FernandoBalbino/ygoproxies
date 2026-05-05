export const DEFAULT_CARD_LAYOUT = {
  width: 813,
  height: 1185,
  name: { x: 63, y: 123, maxWidth: 608, fontSize: 91, minFontSize: 58 },
  attribute: { x: 680, y: 55, size: 76 },
  subfamily: { x: 665, y: 145, size: 43 },
  spellTrapType: {
    rightX: 676,
    y: 187.5,
    maxWidth: 520,
    fontSize: 44.5,
    minFontSize: 31,
  },
  spellTrapTypeNoSubfamily: {
    rightX: 732,
    y: 187.5,
    maxWidth: 648,
    fontSize: 44.5,
    minFontSize: 31,
  },
  stars: { startX: 679, y: 145, size: 50, gap: 3.8 },
  rankStars: { startX: 86, y: 145, size: 50, gap: 3.8 },
  artwork: { x: 100, y: 219, width: 614, height: 614 },
  typeLine: {
    x: 62.5,
    y: 920,
    maxWidth: 684.5,
    fontSize: 32.75,
    minFontSize: 23,
  },
  description: {
    x: 65,
    y: 945.5,
    maxWidth: 684,
    maxHeight: 152,
    fontSize: 24.3,
    minFontSize: 13,
    lineHeight: 24.7,
  },
  spellDescription: {
    x: 64.8,
    y: 914.9,
    maxWidth: 684,
    maxHeight: 211,
    fontSize: 24.38,
    minFontSize: 13,
    lineHeight: 24.7,
  },
  atkDef: { x: 432, y: 1106, fontSize: 37, maxWidth: 316 },
} as const;

export type CardLayout = {
  width: number;
  height: number;
  name: {
    x: number;
    y: number;
    maxWidth: number;
    fontSize: number;
    minFontSize: number;
  };
  attribute: { x: number; y: number; size: number };
  subfamily: { x: number; y: number; size: number };
  spellTrapType: {
    rightX: number;
    y: number;
    maxWidth: number;
    fontSize: number;
    minFontSize: number;
  };
  spellTrapTypeNoSubfamily: {
    rightX: number;
    y: number;
    maxWidth: number;
    fontSize: number;
    minFontSize: number;
  };
  stars: { startX: number; y: number; size: number; gap: number };
  rankStars: { startX: number; y: number; size: number; gap: number };
  artwork: { x: number; y: number; width: number; height: number };
  typeLine: {
    x: number;
    y: number;
    maxWidth: number;
    fontSize: number;
    minFontSize: number;
  };
  description: {
    x: number;
    y: number;
    maxWidth: number;
    maxHeight: number;
    fontSize: number;
    minFontSize: number;
    lineHeight: number;
  };
  spellDescription: {
    x: number;
    y: number;
    maxWidth: number;
    maxHeight: number;
    fontSize: number;
    minFontSize: number;
    lineHeight: number;
  };
  atkDef: { x: number; y: number; fontSize: number; maxWidth: number };
};

export const CARD_LAYOUT: CardLayout = DEFAULT_CARD_LAYOUT;

export const CARD_SIZE_MM = {
  width: 59,
  height: 86,
} as const;

export const A4_SIZE_MM = {
  width: 210,
  height: 297,
} as const;
