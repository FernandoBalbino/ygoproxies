import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { DEFAULT_CARD_LAYOUT, type CardLayout } from "@/config/card-layout";
import type { NormalizedCard, RenderedCard } from "@/types/card.types";
import { publicPathToFilePath, PUBLIC_DIR } from "@/services/path.service";

const YGOCARDER_PUBLIC_ROOT = "/assets/ygocarder/asset";
const YGOCARDER_ASSET_ROOT = path.join(PUBLIC_DIR, "assets", "ygocarder", "asset");
const YGOCARDER_IMAGE_ROOT = path.join(YGOCARDER_ASSET_ROOT, "image");
const YGOCARDER_FONT_ROOT = path.join(YGOCARDER_ASSET_ROOT, "font");

const TEXT_COLOR = "#010101";
const LIGHT_TEXT_COLOR = "#ffffff";
const BASE_FILL_COLOR = "#404040";
const HARD_MIN_FONT_SIZE = 5;
const PENDULUM_ARTWORK = { x: 56, y: 213, width: 702, height: 530 } as const;
const PENDULUM_CLEAR_AREA = { left: 56, top: 213, width: 702, height: 910 } as const;
const PENDULUM_EFFECT_BACKGROUND = { x: 55, y: 738, width: 705, height: 147 } as const;
const PENDULUM_EFFECT_TEXT = { x: 124, y: 750, maxWidth: 566, maxHeight: 112 } as const;
const PENDULUM_SCALE = { blueX: 84.4, redX: 728, y: 848.5, fontSize: 56.5 } as const;
const PENDULUM_SCALE_ICON = { x: 0, y: 750 } as const;
const PENDULUM_BORDER = { x: 30, y: 185 } as const;
const PENDULUM_ARTLESS_BORDER_CLEAR_HEIGHT = 738;

const CARD_FONTS = {
  name: {
    family: "MatrixRegularSmallCaps",
    filePath: path.join(YGOCARDER_FONT_ROOT, "Yu-Gi-Oh Matrix Regular Small Caps 1.ttf"),
    format: "truetype",
  },
  effect: {
    family: "MatrixBook",
    filePath: path.join(YGOCARDER_FONT_ROOT, "Matrix Book.ttf"),
    format: "truetype",
  },
  normalEffect: {
    family: "StoneSerifItalic",
    filePath: path.join(YGOCARDER_FONT_ROOT, "StoneSerif-Italic.otf"),
    format: "opentype",
  },
  stat: {
    family: "MatrixBold",
    filePath: path.join(YGOCARDER_FONT_ROOT, "Matrix-Bold.otf"),
    format: "opentype",
  },
  statNumber: {
    family: "MatrixBoldSmallCaps",
    filePath: path.join(YGOCARDER_FONT_ROOT, "MatrixBoldSmallCaps.woff2"),
    format: "woff2",
  },
  type: {
    family: "YuGiOhITCStoneSerifBSc",
    filePath: path.join(YGOCARDER_FONT_ROOT, "YuGiOhITCStoneSerifBSc.ttf"),
    format: "truetype",
  },
  symbol: {
    family: "matrix",
    filePath: path.join(YGOCARDER_FONT_ROOT, "matrix.woff2"),
    format: "woff2",
  },
} as const;

type CardFont = (typeof CARD_FONTS)[keyof typeof CARD_FONTS];

type FontSizeData = {
  fontSize: number;
  lineHeight: number;
  lineCount: number;
};

type FittedSingleLine = {
  fontSize: number;
  scaleX: number;
  width: number;
  targetWidth: number;
  letterSpacing: number;
};

type FittedTextBlock = {
  font: CardFont;
  fontSize: number;
  lineHeight: number;
  scaleX: number;
  lines: string[];
};

const EFFECT_FONT_LIST_TCG: FontSizeData[] = [
  { fontSize: 40.2, lineHeight: 42.1, lineCount: 5 },
  { fontSize: 33.2, lineHeight: 35.1, lineCount: 6 },
  { fontSize: 28.2, lineHeight: 30.3, lineCount: 7 },
  { fontSize: 24.38, lineHeight: 24.7, lineCount: 8 },
  { fontSize: 19.94, lineHeight: 21.15, lineCount: 10 },
  { fontSize: 18.5, lineHeight: 19.2, lineCount: 11 },
  { fontSize: 17, lineHeight: 17.6, lineCount: 12 },
  { fontSize: 15.6, lineHeight: 16.3, lineCount: 13 },
];

const EFFECT_FONT_LIST_TCG_TYPE_STAT: FontSizeData[] = [
  { fontSize: 45.2, lineHeight: 48.1, lineCount: 3 },
  { fontSize: 34.2, lineHeight: 36.5, lineCount: 4 },
  { fontSize: 27.2, lineHeight: 29.5, lineCount: 5 },
  { fontSize: 24.3, lineHeight: 24.7, lineCount: 6 },
  { fontSize: 19.95, lineHeight: 21.3, lineCount: 7 },
  { fontSize: 18.8, lineHeight: 18.8, lineCount: 8 },
  { fontSize: 16.7, lineHeight: 16.7, lineCount: 9 },
  { fontSize: 15, lineHeight: 15, lineCount: 10 },
];

const NORMAL_FONT_LIST_TCG_TYPE_STAT: FontSizeData[] = [
  { fontSize: 44.2, lineHeight: 47.1, lineCount: 3 },
  { fontSize: 34.2, lineHeight: 36.5, lineCount: 4 },
  { fontSize: 27.2, lineHeight: 29.5, lineCount: 5 },
  { fontSize: 24.5, lineHeight: 24.7, lineCount: 6 },
  { fontSize: 19.28, lineHeight: 21.3, lineCount: 7 },
  { fontSize: 17.78, lineHeight: 18.9, lineCount: 8 },
  { fontSize: 15.46, lineHeight: 16.8, lineCount: 9 },
  { fontSize: 12.99, lineHeight: 15, lineCount: 10 },
];

const PENDULUM_EFFECT_FONT_LIST_TCG: FontSizeData[] = [
  { fontSize: 50.3, lineHeight: 56.35, lineCount: 2 },
  { fontSize: 35.3, lineHeight: 38.85, lineCount: 3 },
  { fontSize: 26.3, lineHeight: 29.35, lineCount: 4 },
  { fontSize: 24.3, lineHeight: 24.35, lineCount: 5 },
  { fontSize: 19.5, lineHeight: 20.23, lineCount: 6 },
  { fontSize: 17, lineHeight: 17.4, lineCount: 7 },
  { fontSize: 14.7, lineHeight: 15.32, lineCount: 8 },
];

const CONDENSE_TOLERANCE_STRICT = 0.685;
const DEFAULT_EFFECT_SIZE_LEVEL = 3;
const NAME_LETTER_SPACING_RATIO = 0.028;

const textWidthCache = new Map<string, Promise<number>>();

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapePangoMarkup(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function assetPath(relativePath: string): string {
  return path.join(YGOCARDER_IMAGE_ROOT, relativePath);
}

function assetPublicPath(relativePath: string): string {
  return `${YGOCARDER_PUBLIC_ROOT}/image/${relativePath.replaceAll(path.sep, "/")}`;
}

function fontFaceCss(font: CardFont): string {
  return `
        @font-face {
          font-family: "${font.family}";
          src: url("${pathToFileURL(font.filePath).href}") format("${font.format}");
          font-weight: normal;
          font-style: normal;
        }`;
}

function cardFontCss(): string {
  return Object.values(CARD_FONTS).map(fontFaceCss).join("\n");
}

function svgFontFamily(font: CardFont): string {
  return `"${font.family}", "Times New Roman", serif`;
}

function frameKey(frameType: string): string {
  const normalized = frameType.toLowerCase();
  if (normalized.endsWith("_pendulum")) return frameKey(normalized.replace("_pendulum", ""));
  if (normalized.startsWith("pendulum_")) return frameKey(normalized.replace("pendulum_", ""));
  if (normalized === "xyz") return "xyz";
  if (normalized === "link") return "link";
  if (normalized === "spell") return "spell";
  if (normalized === "trap") return "trap";
  if (normalized === "ritual") return "ritual";
  if (normalized === "fusion") return "fusion";
  if (normalized === "synchro") return "synchro";
  if (normalized === "normal") return "normal";
  return "effect";
}

function isPendulumCard(card: NormalizedCard): boolean {
  return card.frameType.includes("pendulum")
    || card.typeline.some((term) => term.toLowerCase() === "pendulum" || term.toLowerCase() === "pendulo");
}

function pendulumBottomFrameKey(): string {
  return "spell";
}

function isSpellOrTrap(card: NormalizedCard): boolean {
  return card.frameType === "spell" || card.frameType === "trap";
}

function isMonster(card: NormalizedCard): boolean {
  return !isSpellOrTrap(card);
}

function hasDarkNameBackground(card: NormalizedCard): boolean {
  const frame = frameKey(card.frameType);
  return frame === "xyz" || frame === "link" || isSpellOrTrap(card);
}

function resolveMinFontSize(fontSize: number, minFontSize: number): number {
  if (!Number.isFinite(minFontSize) || minFontSize >= fontSize) {
    return Math.max(HARD_MIN_FONT_SIZE, Math.floor(fontSize * 0.72));
  }

  return Math.max(HARD_MIN_FONT_SIZE, minFontSize);
}

function estimatedTextWidth(text: string, fontSize: number): number {
  return [...text].reduce((width, char) => {
    if (char === " ") return width + fontSize * 0.32;
    if ("ilI.,'`|".includes(char)) return width + fontSize * 0.25;
    if ("MW@#%&".includes(char)) return width + fontSize * 0.92;
    return width + fontSize * 0.56;
  }, 0);
}

async function measureTextWidth(text: string, fontSize: number, font: CardFont): Promise<number> {
  const measurableText = text || " ";
  const cacheKey = `${font.family}|${fontSize}|${measurableText}`;
  const cachedWidth = textWidthCache.get(cacheKey);

  if (cachedWidth) {
    return cachedWidth;
  }

  const measuredWidth = sharp({
    text: {
      text: escapePangoMarkup(measurableText),
      font: `${font.family} ${fontSize}`,
      fontfile: font.filePath,
      rgba: true,
      dpi: 72,
      wrap: "none",
    },
  })
    .metadata()
    .then((metadata) => metadata.width ?? estimatedTextWidth(measurableText, fontSize))
    .catch(() => estimatedTextWidth(measurableText, fontSize));

  textWidthCache.set(cacheKey, measuredWidth);
  return measuredWidth;
}

async function wrapLongToken(token: string, maxWidth: number, fontSize: number, font: CardFont): Promise<string[]> {
  const pieces: string[] = [];
  let current = "";

  for (const char of [...token]) {
    const next = `${current}${char}`;
    if (!current || (await measureTextWidth(next, fontSize, font)) <= maxWidth) {
      current = next;
    } else {
      pieces.push(current);
      current = char;
    }
  }

  if (current) {
    pieces.push(current);
  }

  return pieces;
}

async function wrapParagraph(text: string, maxWidth: number, fontSize: number, font: CardFont): Promise<string[]> {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if ((await measureTextWidth(next, fontSize, font)) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    const wordPieces = await wrapLongToken(word, maxWidth, fontSize, font);
    if (wordPieces.length > 1) {
      lines.push(...wordPieces.slice(0, -1));
    }
    current = wordPieces.at(-1) ?? "";
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

async function wrapText(text: string, maxWidth: number, fontSize: number, font: CardFont): Promise<string[]> {
  const paragraphs = text.split(/\n+/);
  const wrappedParagraphs: string[][] = [];

  for (const paragraph of paragraphs) {
    wrappedParagraphs.push(await wrapParagraph(paragraph, maxWidth, fontSize, font));
  }

  return wrappedParagraphs.flat().filter(Boolean);
}

async function fitSingleLine(
  text: string,
  maxWidth: number,
  fontSize: number,
  minFontSize: number,
  font: CardFont,
  minScaleX = 0.35,
  widthAdjustment = 1,
  letterSpacingRatio = 0,
): Promise<FittedSingleLine> {
  const safeMinFontSize = resolveMinFontSize(fontSize, minFontSize);
  let fittedSize = fontSize;

  while (fittedSize > safeMinFontSize) {
    const letterSpacing = Math.max(0, fittedSize * letterSpacingRatio);
    const letterSpacingWidth = Math.max(0, [...text].length - 1) * letterSpacing;
    const width = ((await measureTextWidth(text, fittedSize, font)) + letterSpacingWidth) * widthAdjustment;
    const scaleX = Math.min(1, maxWidth / Math.max(1, width));

    if (scaleX >= minScaleX) {
      return { fontSize: fittedSize, scaleX, width, targetWidth: width * scaleX, letterSpacing };
    }

    fittedSize -= 1;
  }

  const letterSpacing = Math.max(0, fittedSize * letterSpacingRatio);
  const letterSpacingWidth = Math.max(0, [...text].length - 1) * letterSpacing;
  const width = ((await measureTextWidth(text, fittedSize, font)) + letterSpacingWidth) * widthAdjustment;
  return {
    fontSize: fittedSize,
    scaleX: Math.min(1, maxWidth / Math.max(1, width)),
    width,
    targetWidth: width * Math.min(1, maxWidth / Math.max(1, width)),
    letterSpacing,
  };
}

async function findCondenseRatio(
  text: string,
  maxWidth: number,
  fontSize: number,
  font: CardFont,
  maxLines: number,
  tolerance: number,
): Promise<{ lines: string[]; scaleX: number }> {
  let bestLines = await wrapText(text, maxWidth, fontSize, font);
  if (bestLines.length <= maxLines) {
    return { lines: bestLines, scaleX: 1 };
  }

  for (let median = 995; median >= Math.round(tolerance * 1000); median -= 5) {
    const scaleX = median / 1000;
    const lines = await wrapText(text, maxWidth / scaleX, fontSize, font);
    if (lines.length <= maxLines) {
      return { lines, scaleX };
    }
    bestLines = lines;
  }

  return { lines: bestLines, scaleX: tolerance };
}

async function fitTextBlock(
  text: string,
  maxWidth: number,
  maxHeight: number,
  font: CardFont,
  fontList: FontSizeData[],
  startLevel = DEFAULT_EFFECT_SIZE_LEVEL,
): Promise<FittedTextBlock> {
  const firstLevel = Math.min(Math.max(0, startLevel), fontList.length - 1);

  for (let level = firstLevel; level < fontList.length; level += 1) {
    const fontSizeData = fontList[level];
    const maxLinesByHeight = Math.max(1, Math.floor(maxHeight / fontSizeData.lineHeight));
    const lineCount = Math.min(fontSizeData.lineCount, maxLinesByHeight);
    const fitted = await findCondenseRatio(
      text,
      maxWidth,
      fontSizeData.fontSize,
      font,
      lineCount,
      CONDENSE_TOLERANCE_STRICT,
    );

    if (fitted.lines.length <= lineCount) {
      return {
        font,
        fontSize: fontSizeData.fontSize,
        lineHeight: fontSizeData.lineHeight,
        scaleX: fitted.scaleX,
        lines: fitted.lines,
      };
    }
  }

  const dynamicLineCount = Math.max(1, Math.ceil(maxHeight / 14));
  const dynamicFontSize = Math.max(HARD_MIN_FONT_SIZE, Math.floor(maxHeight / dynamicLineCount) - 1);
  const dynamicLineHeight = Math.max(dynamicFontSize + 1, Math.floor(maxHeight / dynamicLineCount));
  const dynamic = await findCondenseRatio(text, maxWidth, dynamicFontSize, font, dynamicLineCount, 0.55);

  return {
    font,
    fontSize: dynamicFontSize,
    lineHeight: dynamicLineHeight,
    scaleX: dynamic.scaleX,
    lines: dynamic.lines.slice(0, dynamicLineCount),
  };
}

function textGroup(lines: string[], x: number, firstBaseline: number, fontSize: number, lineHeight: number, scaleX: number, className: string): string {
  return lines
    .map((line, index) => {
      const y = firstBaseline + index * lineHeight;
      return `<g transform="translate(${x}, 0) scale(${scaleX}, 1)"><text x="0" y="${y}" class="${className}" font-size="${fontSize}">${escapeXml(line)}</text></g>`;
    })
    .join("");
}

function centeredTextGroup(
  textBlock: FittedTextBlock,
  box: { x: number; y: number; maxHeight: number },
  className: string,
): string {
  const usedHeight = Math.max(textBlock.fontSize, textBlock.lines.length * textBlock.lineHeight);
  const firstBaseline = box.y + Math.max(0, (box.maxHeight - usedHeight) / 2) + textBlock.fontSize * 0.9;
  return textGroup(textBlock.lines, box.x, firstBaseline, textBlock.fontSize, textBlock.lineHeight, textBlock.scaleX, className);
}

function compressedText(
  text: string,
  x: number,
  y: number,
  fitted: FittedSingleLine,
  className: string,
  textAnchor = "start",
): string {
  const targetWidth = Math.max(1, fitted.targetWidth);
  const translateX = textAnchor === "end" ? x - targetWidth : x;
  const letterSpacing = fitted.letterSpacing > 0 ? ` letter-spacing="${fitted.letterSpacing}"` : "";

  return `<g transform="translate(${translateX}, 0) scale(${fitted.scaleX}, 1)"><text x="0" y="${y}" class="${className}" font-size="${fitted.fontSize}"${letterSpacing}>${escapeXml(text)}</text></g>`;
}

function typeLineText(card: NormalizedCard): string {
  return `[${card.typeline.join("/").toLocaleUpperCase("pt-BR")}]`;
}

function spellTrapTypeText(card: NormalizedCard): string {
  return card.frameType === "trap" ? "CARTA ARMADILHA" : "CARTA MÁGICA";
}

function statText(value?: number | null): string {
  if (value === null || value === undefined) return "?";
  return `${value}`;
}

function starPositions(card: NormalizedCard, layout: CardLayout): Array<{ left: number; top: number }> {
  const frame = frameKey(card.frameType);
  if (!card.level || isSpellOrTrap(card) || frame === "link") {
    return [];
  }

  const count = Math.min(Math.max(card.level, 0), 13);
  const starLayout = frame === "xyz" ? layout.rankStars : layout.stars;

  return Array.from({ length: count }, (_, index) => ({
    left: frame === "xyz"
      ? Math.round(starLayout.startX + index * (starLayout.size + starLayout.gap))
      : Math.round(starLayout.startX - index * (starLayout.size + starLayout.gap)),
    top: starLayout.y,
  }));
}

function linkMarkerToIndex(marker: string): string | null {
  const normalized = marker.toLowerCase();
  const map: Record<string, string> = {
    "bottom-left": "7",
    bottom: "8",
    "bottom-right": "9",
    left: "4",
    right: "6",
    "top-left": "1",
    top: "2",
    "top-right": "3",
  };

  return map[normalized] ?? null;
}

function linkArrowPositions(markers?: string[]): Array<{ index: string; left: number; top: number; width: number; height: number }> {
  if (!markers?.length) return [];
  const active = new Set(markers.map(linkMarkerToIndex).filter((index): index is string => Boolean(index)));
  const positions: Record<string, { left: number; top: number; width: number; height: number }> = {
    "1": { left: 55, top: 175, width: 100, height: 100 },
    "2": { left: 323, top: 165, width: 170, height: 80 },
    "3": { left: 655, top: 175, width: 100, height: 100 },
    "4": { left: 45, top: 442, width: 70, height: 170 },
    "6": { left: 700, top: 442, width: 70, height: 170 },
    "7": { left: 55, top: 775, width: 100, height: 100 },
    "8": { left: 323, top: 810, width: 170, height: 80 },
    "9": { left: 655, top: 775, width: 100, height: 100 },
  };

  return [...active].flatMap((index) => {
    const position = positions[index];
    return position ? [{ index, ...position }] : [];
  });
}

function spellTrapSubfamilyPlacement(layout: CardLayout): { iconLeft: number; iconTop: number; closeBracketX: number; textRightX: number } {
  const closeBracketX = Math.round(Math.min(layout.spellTrapTypeNoSubfamily.rightX - 20, layout.width - 92));
  const iconLeft = Math.round(closeBracketX - layout.subfamily.size - 4);

  return {
    iconLeft,
    iconTop: Math.round(layout.subfamily.y),
    closeBracketX,
    textRightX: iconLeft - 8,
  };
}

async function buildResizedAsset(publicPath: string, width: number, height: number, fit: "contain" | "cover" | "fill" = "contain"): Promise<Buffer> {
  return sharp(publicPathToFilePath(publicPath))
    .resize(width, height, { fit, position: "center", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function buildAttributeIconAsset(publicPath: string, size: number): Promise<Buffer> {
  const filePath = publicPathToFilePath(publicPath);

  return sharp(filePath)
    .ensureAlpha()
    .resize(size, size, { fit: "contain", position: "center", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function buildImageAsset(relativePath: string, width?: number, height?: number): Promise<Buffer> {
  const image = sharp(assetPath(relativePath));
  if (width && height) {
    return image.resize(width, height, { fit: "fill" }).png().toBuffer();
  }

  return image.png().toBuffer();
}

async function buildImageAssetWithClearedArea(
  relativePath: string,
  clearArea: { left: number; top: number; width: number; height: number },
): Promise<Buffer> {
  const clearMask = Buffer.from(`
    <svg width="${DEFAULT_CARD_LAYOUT.width}" height="${DEFAULT_CARD_LAYOUT.height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${clearArea.left}" y="${clearArea.top}" width="${clearArea.width}" height="${clearArea.height}" fill="white" />
    </svg>
  `);

  return sharp(assetPath(relativePath))
    .ensureAlpha()
    .composite([{ input: clearMask, blend: "dest-out" }])
    .png()
    .toBuffer();
}

async function buildPendulumBorderAsset(): Promise<Buffer> {
  const clearTopMask = Buffer.from(`
    <svg width="${DEFAULT_CARD_LAYOUT.width}" height="${DEFAULT_CARD_LAYOUT.height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${DEFAULT_CARD_LAYOUT.width}" height="${PENDULUM_ARTLESS_BORDER_CLEAR_HEIGHT}" fill="white" />
    </svg>
  `);

  return sharp({
    create: {
      width: DEFAULT_CARD_LAYOUT.width,
      height: DEFAULT_CARD_LAYOUT.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await buildImageAsset("frame-pendulum/border-pendulum-medium-base-artless.png"),
        left: PENDULUM_BORDER.x,
        top: PENDULUM_BORDER.y,
      },
      {
        input: clearTopMask,
        blend: "dest-out",
      },
      {
        input: await buildImageAsset("frame-pendulum/border-pendulum-medium-base.png"),
        left: PENDULUM_BORDER.x,
        top: PENDULUM_BORDER.y,
      },
    ])
    .png()
    .toBuffer();
}

async function buildImagePatch(relativePath: string, left: number, top: number, width: number, height: number): Promise<Buffer> {
  return sharp(assetPath(relativePath))
    .extract({ left, top, width, height })
    .png()
    .toBuffer();
}

async function optionalAsset(relativePath: string, width?: number, height?: number): Promise<Buffer | null> {
  try {
    await fs.access(assetPath(relativePath));
    return buildImageAsset(relativePath, width, height);
  } catch {
    return null;
  }
}

async function buildTextOverlay(card: NormalizedCard, layout: CardLayout): Promise<Buffer> {
  const isPendulum = isPendulumCard(card);
  const frame = frameKey(card.frameType);
  const renderedName = card.name;
  const nameMaxWidth = Math.max(
    180,
    Math.min(layout.name.maxWidth, layout.attribute.x - layout.name.x - 48),
  );
  const name = await fitSingleLine(
    renderedName,
    nameMaxWidth,
    layout.name.fontSize,
    layout.name.minFontSize,
    CARD_FONTS.name,
    0.34,
    1.02,
    NAME_LETTER_SPACING_RATIO,
  );
  const typeLine = isMonster(card)
    ? await fitSingleLine(typeLineText(card), layout.typeLine.maxWidth, layout.typeLine.fontSize, layout.typeLine.minFontSize, CARD_FONTS.type, 0.72)
    : null;
  const spellTrapType = !isMonster(card)
    ? await fitSingleLine(`[${spellTrapTypeText(card)}]`, layout.spellTrapTypeNoSubfamily.maxWidth, layout.spellTrapTypeNoSubfamily.fontSize, layout.spellTrapTypeNoSubfamily.minFontSize, CARD_FONTS.type, 0.72, 1.25)
    : null;
  const spellTrapSubfamily = spellTrapSubfamilyPlacement(layout);
  const spellTrapTypeWithIcon = !isMonster(card) && card.subfamilyIconPath
    ? await fitSingleLine(`[${spellTrapTypeText(card)}`, layout.spellTrapType.maxWidth, layout.spellTrapType.fontSize, layout.spellTrapType.minFontSize, CARD_FONTS.type, 0.72, 1.25)
    : null;
  const descLayout = isSpellOrTrap(card) ? layout.spellDescription : layout.description;
  const descFont = card.frameType === "normal" ? CARD_FONTS.normalEffect : CARD_FONTS.effect;
  const descFontList = card.frameType === "normal"
    ? NORMAL_FONT_LIST_TCG_TYPE_STAT
    : isSpellOrTrap(card)
      ? EFFECT_FONT_LIST_TCG
      : EFFECT_FONT_LIST_TCG_TYPE_STAT;
  const description = await fitTextBlock(
    card.desc,
    descLayout.maxWidth,
    descLayout.maxHeight,
    descFont,
    descFontList,
  );
  const pendulumDescription = isPendulum && card.pendulumDescription
    ? await fitTextBlock(
        card.pendulumDescription,
        PENDULUM_EFFECT_TEXT.maxWidth,
        PENDULUM_EFFECT_TEXT.maxHeight,
        CARD_FONTS.effect,
        PENDULUM_EFFECT_FONT_LIST_TCG,
      )
    : null;
  const atk = await fitSingleLine(statText(card.atk), 74, layout.atkDef.fontSize, 22, CARD_FONTS.statNumber, 0.7);
  const def = await fitSingleLine(
    frame === "link" ? statText(card.linkval ?? null) : statText(card.def),
    74,
    layout.atkDef.fontSize,
    22,
    CARD_FONTS.statNumber,
    0.7,
  );

  const spellTrapTypeLine = (() => {
    if (isMonster(card) || !spellTrapType) return "";
    if (!card.subfamilyIconPath) {
      return compressedText(`[${spellTrapTypeText(card)}]`, layout.spellTrapTypeNoSubfamily.rightX, layout.spellTrapTypeNoSubfamily.y, spellTrapType, "type", "end");
    }

    const textOnly = `[${spellTrapTypeText(card)}`;
    return `
      ${spellTrapTypeWithIcon ? compressedText(textOnly, spellTrapSubfamily.textRightX, layout.spellTrapType.y, spellTrapTypeWithIcon, "type", "end") : ""}
      <text x="${spellTrapSubfamily.closeBracketX}" y="${layout.spellTrapType.y}" class="type" font-size="${layout.spellTrapType.fontSize}">]</text>
    `;
  })();

  const statLine = isMonster(card)
    ? `
      <text x="432.1" y="${layout.atkDef.y}" class="stat-label" font-size="35.73">ATK/</text>
      ${compressedText(statText(card.atk), 581.8, layout.atkDef.y + 0.5, atk, "stat-value", "end")}
      <text x="${frame === "link" ? 593 : 600.85}" y="${layout.atkDef.y}" class="stat-label" font-size="35.73">${frame === "link" ? "LINK/" : "DEF/"}</text>
      ${compressedText(frame === "link" ? statText(card.linkval ?? null) : statText(card.def), 747.8, layout.atkDef.y + 0.5, def, "stat-value", "end")}
    `
    : "";

  const svg = `
    <svg width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        ${cardFontCss()}
        .name {
          fill: ${hasDarkNameBackground(card) ? LIGHT_TEXT_COLOR : TEXT_COLOR};
          stroke: ${hasDarkNameBackground(card) ? LIGHT_TEXT_COLOR : TEXT_COLOR};
          stroke-width: 0.25;
          paint-order: stroke fill;
          font-family: ${svgFontFamily(CARD_FONTS.name)};
          font-variant: small-caps;
          font-feature-settings: "smcp" 1, "c2sc" 1;
          font-weight: normal;
        }
        .type {
          fill: ${TEXT_COLOR};
          font-family: ${svgFontFamily(CARD_FONTS.type)};
          font-weight: normal;
        }
        .effect {
          fill: ${TEXT_COLOR};
          font-family: ${svgFontFamily(description.font)};
          font-weight: normal;
        }
        .stat-label {
          fill: ${TEXT_COLOR};
          font-family: ${svgFontFamily(CARD_FONTS.stat)};
          font-weight: normal;
        }
        .stat-value {
          fill: ${TEXT_COLOR};
          font-family: ${svgFontFamily(CARD_FONTS.statNumber)};
          font-weight: normal;
        }
        .pendulum-scale {
          fill: ${TEXT_COLOR};
          font-family: ${svgFontFamily(CARD_FONTS.statNumber)};
          font-weight: normal;
          text-anchor: middle;
        }
      </style>
      ${compressedText(renderedName, layout.name.x, layout.name.y, name, "name")}
      ${typeLine ? compressedText(typeLineText(card), layout.typeLine.x, layout.typeLine.y, typeLine, "type") : ""}
      ${spellTrapTypeLine}
      ${pendulumDescription ? centeredTextGroup(pendulumDescription, PENDULUM_EFFECT_TEXT, "effect") : ""}
      ${isPendulum ? `
        <text x="${PENDULUM_SCALE.blueX}" y="${PENDULUM_SCALE.y}" class="pendulum-scale" font-size="${PENDULUM_SCALE.fontSize}">${escapeXml(statText(card.pendulumScale ?? 0))}</text>
        <text x="${PENDULUM_SCALE.redX}" y="${PENDULUM_SCALE.y}" class="pendulum-scale" font-size="${PENDULUM_SCALE.fontSize}">${escapeXml(statText(card.pendulumScale ?? 0))}</text>
      ` : ""}
      ${textGroup(description.lines, descLayout.x, descLayout.y, description.fontSize, description.lineHeight, description.scaleX, "effect")}
      ${statLine}
    </svg>
  `;

  return Buffer.from(svg);
}

export async function renderCardImage(card: NormalizedCard, sourceImageBuffer: Buffer, layout: CardLayout = DEFAULT_CARD_LAYOUT): Promise<RenderedCard> {
  if (!card.isSupported) {
    throw new Error(card.unsupportedReason ?? "Tipo de carta nao suportado.");
  }

  if (!sourceImageBuffer.length) {
    throw new Error("Imagem da carta nao encontrada.");
  }

  const frame = frameKey(card.frameType);
  const isPendulum = isPendulumCard(card);
  const bottomFrame = isPendulum ? pendulumBottomFrameKey() : frame;
  const artworkLayout = isPendulum ? PENDULUM_ARTWORK : layout.artwork;
  const artworkBuffer = await sharp(sourceImageBuffer)
    .resize(artworkLayout.width, artworkLayout.height, { fit: "cover", position: isPendulum ? "north" : "center" })
    .png()
    .toBuffer();
  const composites: sharp.OverlayOptions[] = [
    {
      input: artworkBuffer,
      left: artworkLayout.x,
      top: artworkLayout.y,
    },
    {
      input: isPendulum
        ? await buildImageAssetWithClearedArea(`frame/frame-${frame}.png`, PENDULUM_CLEAR_AREA)
        : await buildImageAsset(`frame/frame-${frame}.png`, layout.width, layout.height),
      left: 0,
      top: 0,
    },
  ];

  if (isPendulum) {
    composites.push({
      input: await buildImageAsset(`frame-pendulum/frame-pendulum-${bottomFrame}.png`, layout.width, layout.height),
      left: 0,
      top: 0,
    });
  }

  const cardBorder = await optionalAsset("frame/card-border-normal.png", layout.width, layout.height);
  if (cardBorder) composites.push({ input: cardBorder, left: 0, top: 0 });

  if (isPendulum) {
    composites.push({
      input: artworkBuffer,
      left: artworkLayout.x,
      top: artworkLayout.y,
    });
  }

  const nameBackground = await optionalAsset(`background/background-name-${frame}.png`);
  if (nameBackground) composites.push({ input: nameBackground, left: 0, top: 0 });

  const effectBackground = await optionalAsset(`background/background-text-${bottomFrame}.png`);
  if (effectBackground) composites.push({ input: effectBackground, left: 54, top: 884 });

  if (isPendulum) {
    const pendulumBackground = await optionalAsset(
      `background/background-pendulum-${bottomFrame}.png`,
      PENDULUM_EFFECT_BACKGROUND.width,
      PENDULUM_EFFECT_BACKGROUND.height,
    );
    if (pendulumBackground) {
      composites.push({
        input: pendulumBackground,
        left: PENDULUM_EFFECT_BACKGROUND.x,
        top: PENDULUM_EFFECT_BACKGROUND.y,
      });
    }
  }

  if (!isPendulum) {
    const effectBorder = await optionalAsset("frame/effect-border-base.png");
    if (effectBorder) composites.push({ input: effectBorder, left: 35, top: 860 });
  }

  if (isPendulum) {
    const pendulumScaleIcon = await optionalAsset("frame-pendulum/pendulum-scale-medium.png");
    if (pendulumScaleIcon) {
      composites.push({
        input: pendulumScaleIcon,
        left: PENDULUM_SCALE_ICON.x,
        top: PENDULUM_SCALE_ICON.y,
      });
    }

    composites.push({
      input: await buildPendulumBorderAsset(),
      left: 0,
      top: 0,
    });
  } else {
    const artBorderSource = frame === "xyz" ? "frame/art-border-xyz.png" : "frame/art-border-base.png";
    const artBorder = await optionalAsset(artBorderSource);
    if (artBorder) composites.push({ input: artBorder, left: 60, top: 170 });
  }

  if (frame === "link") {
    for (const arrow of linkArrowPositions(card.linkmarkers)) {
      const base = await optionalAsset(`link/link-inactive-${arrow.index}-base.png`, arrow.width, arrow.height);
      const core = await optionalAsset(`link/link-inactive-${arrow.index}-core.png`, arrow.width, arrow.height);
      const activeBase = await optionalAsset(`link/link-active-${arrow.index}-base.png`, arrow.width, arrow.height);
      const activeCore = await optionalAsset(`link/link-active-${arrow.index}-core.png`, arrow.width, arrow.height);
      if (base) composites.push({ input: base, left: arrow.left, top: arrow.top });
      if (core) composites.push({ input: core, left: arrow.left, top: arrow.top });
      if (activeBase) composites.push({ input: activeBase, left: arrow.left, top: arrow.top });
      if (activeCore) composites.push({ input: activeCore, left: arrow.left, top: arrow.top });
    }
  }

  const nameBorder = await optionalAsset(frame === "xyz" ? "frame/name-border-xyz.png" : "frame/name-border-normal.png");
  if (nameBorder) composites.push({ input: nameBorder, left: 0, top: 0 });

  const frameBorder = await optionalAsset(frame === "xyz" ? "frame/frame-border-xyz.png" : "frame/frame-border-normal.png", layout.width, layout.height);
  if (frameBorder) composites.push({ input: frameBorder, left: 0, top: 0 });

  if (isPendulum && frame !== "xyz") {
    const pendulumFrameBorder = await optionalAsset("frame/frame-border-pendulum.png", layout.width, layout.height);
    if (pendulumFrameBorder) composites.push({ input: pendulumFrameBorder, left: 0, top: 0 });
  }

  if (card.attributeIconPath) {
    const attributePatch = {
      left: Math.max(0, Math.round(layout.attribute.x - 22)),
      top: Math.max(0, Math.round(layout.attribute.y - 12)),
      width: Math.min(layout.width - Math.round(layout.attribute.x - 22), Math.round(layout.attribute.size + 44)),
      height: Math.min(layout.height - Math.round(layout.attribute.y - 12), Math.round(layout.attribute.size + 24)),
    };
    composites.push({
      input: await buildImagePatch(`frame/frame-${frame}.png`, attributePatch.left, attributePatch.top, attributePatch.width, attributePatch.height),
      left: attributePatch.left,
      top: attributePatch.top,
    });
  }

  if (card.attributeIconPath) {
    composites.push({
      input: await buildAttributeIconAsset(card.attributeIconPath, layout.attribute.size),
      left: layout.attribute.x,
      top: layout.attribute.y,
    });
  }

  if (card.subfamilyIconPath && isSpellOrTrap(card)) {
    const spellTrapSubfamily = spellTrapSubfamilyPlacement(layout);
    composites.push({
      input: await buildResizedAsset(card.subfamilyIconPath, layout.subfamily.size, layout.subfamily.size),
      left: spellTrapSubfamily.iconLeft,
      top: spellTrapSubfamily.iconTop,
    });
  }

  const starPath = frame === "xyz"
    ? assetPublicPath("subfamily/subfamily-rank.png")
    : assetPublicPath("subfamily/subfamily-level.png");
  const starSize = frame === "xyz" ? layout.rankStars.size : layout.stars.size;
  const starBuffer = await buildResizedAsset(starPath, starSize, starSize);
  composites.push(
    ...starPositions(card, layout).map((position) => ({
      input: starBuffer,
      left: position.left,
      top: position.top,
    })),
  );

  composites.push({
    input: await buildTextOverlay(card, layout),
    left: 0,
    top: 0,
  });

  const renderedBuffer = await sharp({
    create: {
      width: layout.width,
      height: layout.height,
      channels: 4,
      background: BASE_FILL_COLOR,
    },
  })
    .composite(composites)
    .png({ quality: 100, compressionLevel: 6, adaptiveFiltering: true })
    .toBuffer();

  return {
    ...card,
    renderedImageDataUrl: `data:image/png;base64,${renderedBuffer.toString("base64")}`,
  };
}
