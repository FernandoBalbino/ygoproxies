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
const EFFECT_BULLET = "●";
const EFFECT_BULLET_SPACE_AFTER = 7;
const EFFECT_STAT_SEPARATOR = {
  leftX: 64.8,
  rightX: 748.8,
  yOffsetFromAtkBaseline: 31,
  strokeWidth: 2.2,
  textGap: 2,
} as const;
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

let cardFontWarmupPromise: Promise<void> | null = null;

type FontSizeData = {
  fontSize: number;
  lineHeight: number;
  lineCount: number;
  bulletWidth?: number;
  bulletOffset?: number;
  bulletSpaceAfter?: number;
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
  bulletWidth?: number;
  bulletOffset?: number;
  bulletSpaceAfter?: number;
};

type BulletTextToken =
  | { type: "text"; value: string }
  | { type: "bullet" };

type RenderScale = 1 | 2;

type RenderCardImageOptions = {
  scale?: RenderScale;
};

function scaledNumber(value: number, scale: RenderScale): number {
  return scale === 1 ? value : value * scale;
}

function scaledInteger(value: number, scale: RenderScale): number {
  return scale === 1 ? Math.round(value) : Math.round(value * scale);
}

function scaleBox<T extends Record<string, number>>(box: T, scale: RenderScale): T {
  if (scale === 1) return box;

  return Object.fromEntries(
    Object.entries(box).map(([key, value]) => [key, scaledNumber(value, scale)]),
  ) as T;
}

function scaleFontList(fontList: FontSizeData[], scale: RenderScale): FontSizeData[] {
  if (scale === 1) return fontList;

  return fontList.map((item) => ({
    ...item,
    fontSize: scaledNumber(item.fontSize, scale),
    lineHeight: scaledNumber(item.lineHeight, scale),
    ...(typeof item.bulletWidth === "number" ? { bulletWidth: scaledNumber(item.bulletWidth, scale) } : {}),
    ...(typeof item.bulletOffset === "number" ? { bulletOffset: scaledNumber(item.bulletOffset, scale) } : {}),
    ...(typeof item.bulletWidth === "number"
      ? { bulletSpaceAfter: scaledNumber(item.bulletSpaceAfter ?? EFFECT_BULLET_SPACE_AFTER, scale) }
      : {}),
  }));
}

function scaleLayout(layout: CardLayout, scale: RenderScale): CardLayout {
  if (scale === 1) return layout;

  return {
    width: scaledInteger(layout.width, scale),
    height: scaledInteger(layout.height, scale),
    name: scaleBox(layout.name, scale),
    attribute: scaleBox(layout.attribute, scale),
    subfamily: scaleBox(layout.subfamily, scale),
    spellTrapType: scaleBox(layout.spellTrapType, scale),
    spellTrapTypeNoSubfamily: scaleBox(layout.spellTrapTypeNoSubfamily, scale),
    stars: scaleBox(layout.stars, scale),
    rankStars: scaleBox(layout.rankStars, scale),
    artwork: scaleBox(layout.artwork, scale),
    typeLine: scaleBox(layout.typeLine, scale),
    description: scaleBox(layout.description, scale),
    spellDescription: scaleBox(layout.spellDescription, scale),
    atkDef: scaleBox(layout.atkDef, scale),
  };
}

const EFFECT_FONT_LIST_TCG: FontSizeData[] = [
  { fontSize: 40.2, lineHeight: 42.1, lineCount: 5, bulletWidth: 38, bulletOffset: 1 },
  { fontSize: 33.2, lineHeight: 35.1, lineCount: 6, bulletWidth: 30 },
  { fontSize: 28.2, lineHeight: 30.3, lineCount: 7, bulletWidth: 26 },
  { fontSize: 24.38, lineHeight: 24.7, lineCount: 8, bulletWidth: 23 },
  { fontSize: 19.94, lineHeight: 21.15, lineCount: 10, bulletWidth: 23, bulletOffset: 1 },
  { fontSize: 18.5, lineHeight: 19.2, lineCount: 11, bulletWidth: 21, bulletOffset: 1 },
  { fontSize: 17, lineHeight: 17.6, lineCount: 12, bulletWidth: 19, bulletOffset: 1 },
  { fontSize: 15.6, lineHeight: 16.3, lineCount: 13, bulletWidth: 17, bulletOffset: 1 },
];

const EFFECT_FONT_LIST_TCG_TYPE_STAT: FontSizeData[] = [
  { fontSize: 45.2, lineHeight: 48.1, lineCount: 3, bulletWidth: 40, bulletOffset: 1 },
  { fontSize: 34.2, lineHeight: 36.5, lineCount: 4, bulletWidth: 30 },
  { fontSize: 27.2, lineHeight: 29.5, lineCount: 5, bulletWidth: 26 },
  { fontSize: 24.3, lineHeight: 24.7, lineCount: 6, bulletWidth: 23 },
  { fontSize: 19.95, lineHeight: 21.3, lineCount: 7, bulletWidth: 23, bulletOffset: 1 },
  { fontSize: 18.8, lineHeight: 18.8, lineCount: 8, bulletWidth: 23, bulletOffset: 1 },
  { fontSize: 16.7, lineHeight: 16.7, lineCount: 9, bulletWidth: 19, bulletOffset: 1 },
  { fontSize: 15, lineHeight: 15, lineCount: 10, bulletWidth: 19, bulletOffset: 2 },
];

const NORMAL_FONT_LIST_TCG_TYPE_STAT: FontSizeData[] = [
  { fontSize: 44.2, lineHeight: 47.1, lineCount: 3, bulletWidth: 40, bulletOffset: 1 },
  { fontSize: 34.2, lineHeight: 36.5, lineCount: 4, bulletWidth: 30 },
  { fontSize: 27.2, lineHeight: 29.5, lineCount: 5, bulletWidth: 26 },
  { fontSize: 24.5, lineHeight: 24.7, lineCount: 6, bulletWidth: 23 },
  { fontSize: 19.28, lineHeight: 21.3, lineCount: 7, bulletWidth: 23 },
  { fontSize: 17.78, lineHeight: 18.9, lineCount: 8, bulletWidth: 23 },
  { fontSize: 15.46, lineHeight: 16.8, lineCount: 9, bulletWidth: 19, bulletOffset: 1 },
  { fontSize: 12.99, lineHeight: 15, lineCount: 10, bulletWidth: 19, bulletOffset: 2 },
];

const PENDULUM_EFFECT_FONT_LIST_TCG: FontSizeData[] = [
  { fontSize: 50.3, lineHeight: 56.35, lineCount: 2, bulletWidth: 41 },
  { fontSize: 35.3, lineHeight: 38.85, lineCount: 3, bulletWidth: 34, bulletOffset: 2 },
  { fontSize: 26.3, lineHeight: 29.35, lineCount: 4, bulletWidth: 27, bulletOffset: 3 },
  { fontSize: 24.3, lineHeight: 24.35, lineCount: 5, bulletWidth: 23 },
  { fontSize: 19.5, lineHeight: 20.23, lineCount: 6, bulletWidth: 19 },
  { fontSize: 17, lineHeight: 17.4, lineCount: 7, bulletWidth: 18, bulletOffset: 1 },
  { fontSize: 14.7, lineHeight: 15.32, lineCount: 8, bulletWidth: 16 },
];

const CONDENSE_TOLERANCE_STRICT = 0.685;
const DEFAULT_EFFECT_SIZE_LEVEL = 3;
const NAME_LETTER_SPACING_RATIO = 0.028;
const SPELL_TRAP_SUBFAMILY_TEXT_GAP = 4;
const SPELL_TRAP_SUBFAMILY_BRACKET_GAP = 4;

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

async function warmUpCardFonts(): Promise<void> {
  if (!cardFontWarmupPromise) {
    cardFontWarmupPromise = (async () => {
      await Promise.all(
        Object.values(CARD_FONTS).map((font) => sharp({
          text: {
            text: escapePangoMarkup("YGO 123 ÁÉÍÓÚ Ç"),
            font: `${font.family} 32`,
            fontfile: font.filePath,
            rgba: true,
            dpi: 72,
            wrap: "none",
          },
        }).metadata().catch(() => undefined)),
      );

      const svg = Buffer.from(`
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <style>
            ${cardFontCss()}
          </style>
          ${Object.values(CARD_FONTS).map((font, index) => (
            `<text x="0" y="${index + 8}" font-family="${svgFontFamily(font)}" font-size="8">YGO</text>`
          )).join("")}
        </svg>
      `);

      await sharp(svg).png().toBuffer().catch(() => undefined);
    })().catch(() => {
      cardFontWarmupPromise = null;
    });
  }

  return cardFontWarmupPromise;
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

function splitDrawableBulletText(text: string): BulletTextToken[] {
  const tokens: BulletTextToken[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const bulletIndex = text.indexOf(EFFECT_BULLET, cursor);
    if (bulletIndex === -1) {
      tokens.push({ type: "text", value: text.slice(cursor) });
      break;
    }

    if (bulletIndex > cursor) {
      tokens.push({ type: "text", value: text.slice(cursor, bulletIndex) });
    }

    tokens.push({ type: "bullet" });
    cursor = bulletIndex + EFFECT_BULLET.length;

    if (text[cursor] === " ") {
      cursor += 1;
    }
  }

  return tokens.filter((token) => token.type === "bullet" || token.value.length > 0);
}

function defaultBulletWidth(fontSize: number): number {
  return Math.max(16, Math.round(fontSize * 0.95));
}

async function measureTextWidth(text: string, fontSize: number, font: CardFont, bulletWidth?: number): Promise<number> {
  const measurableText = text || " ";
  const resolvedBulletWidth = bulletWidth ?? defaultBulletWidth(fontSize);
  const cacheKey = `${font.family}|${fontSize}|${resolvedBulletWidth}|${measurableText}`;
  const cachedWidth = textWidthCache.get(cacheKey);

  if (cachedWidth) {
    return cachedWidth;
  }

  const measuredWidth = measurableText.includes(EFFECT_BULLET)
    ? (async () => {
        let width = 0;
        for (const token of splitDrawableBulletText(measurableText)) {
          width += token.type === "bullet"
            ? resolvedBulletWidth
            : await measureTextWidth(token.value, fontSize, font);
        }
        return width;
      })()
    : sharp({
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

async function wrapLongToken(token: string, maxWidth: number, fontSize: number, font: CardFont, bulletWidth?: number): Promise<string[]> {
  const pieces: string[] = [];
  let current = "";

  for (const char of [...token]) {
    const next = `${current}${char}`;
    if (!current || (await measureTextWidth(next, fontSize, font, bulletWidth)) <= maxWidth) {
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

async function wrapParagraph(text: string, maxWidth: number, fontSize: number, font: CardFont, bulletWidth?: number): Promise<string[]> {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if ((await measureTextWidth(next, fontSize, font, bulletWidth)) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    const wordPieces = await wrapLongToken(word, maxWidth, fontSize, font, bulletWidth);
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

async function wrapText(text: string, maxWidth: number, fontSize: number, font: CardFont, bulletWidth?: number): Promise<string[]> {
  const paragraphs = text.split(/\n+/);
  const wrappedParagraphs: string[][] = [];

  for (const paragraph of paragraphs) {
    wrappedParagraphs.push(await wrapParagraph(paragraph, maxWidth, fontSize, font, bulletWidth));
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
    const width = (await measureTextWidth(text, fittedSize, font)) + letterSpacingWidth;
    const fitWidth = width * widthAdjustment;
    const scaleX = Math.min(1, maxWidth / Math.max(1, fitWidth));

    if (scaleX >= minScaleX) {
      return { fontSize: fittedSize, scaleX, width, targetWidth: width * scaleX, letterSpacing };
    }

    fittedSize -= 1;
  }

  const letterSpacing = Math.max(0, fittedSize * letterSpacingRatio);
  const letterSpacingWidth = Math.max(0, [...text].length - 1) * letterSpacing;
  const width = (await measureTextWidth(text, fittedSize, font)) + letterSpacingWidth;
  const fitWidth = width * widthAdjustment;
  const scaleX = Math.min(1, maxWidth / Math.max(1, fitWidth));

  return {
    fontSize: fittedSize,
    scaleX,
    width,
    targetWidth: width * scaleX,
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
  bulletWidth?: number,
): Promise<{ lines: string[]; scaleX: number }> {
  let bestLines = await wrapText(text, maxWidth, fontSize, font, bulletWidth);
  if (bestLines.length <= maxLines) {
    return { lines: bestLines, scaleX: 1 };
  }

  for (let median = 995; median >= Math.round(tolerance * 1000); median -= 5) {
    const scaleX = median / 1000;
    const lines = await wrapText(text, maxWidth / scaleX, fontSize, font, bulletWidth);
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
      fontSizeData.bulletWidth,
    );

    if (fitted.lines.length <= lineCount) {
      return {
        font,
        fontSize: fontSizeData.fontSize,
        lineHeight: fontSizeData.lineHeight,
        scaleX: fitted.scaleX,
        lines: fitted.lines,
        bulletWidth: fontSizeData.bulletWidth,
        bulletOffset: fontSizeData.bulletOffset,
        bulletSpaceAfter: fontSizeData.bulletSpaceAfter ?? (fontSizeData.bulletWidth ? EFFECT_BULLET_SPACE_AFTER : undefined),
      };
    }
  }

  const dynamicLineCount = Math.max(1, Math.ceil(maxHeight / 14));
  const dynamicFontSize = Math.max(HARD_MIN_FONT_SIZE, Math.floor(maxHeight / dynamicLineCount) - 1);
  const dynamicLineHeight = Math.max(dynamicFontSize + 1, Math.floor(maxHeight / dynamicLineCount));
  const dynamicBulletWidth = defaultBulletWidth(dynamicFontSize);
  const dynamic = await findCondenseRatio(text, maxWidth, dynamicFontSize, font, dynamicLineCount, 0.55, dynamicBulletWidth);

  return {
    font,
    fontSize: dynamicFontSize,
    lineHeight: dynamicLineHeight,
    scaleX: dynamic.scaleX,
    lines: dynamic.lines.slice(0, dynamicLineCount),
    bulletWidth: dynamicBulletWidth,
    bulletOffset: 1,
    bulletSpaceAfter: Math.min(EFFECT_BULLET_SPACE_AFTER, Math.max(2, dynamicBulletWidth * 0.35)),
  };
}

async function textLineWithDrawnBullets(
  line: string,
  y: number,
  fontSize: number,
  font: CardFont,
  className: string,
  bulletWidth: number,
  bulletOffset = 0,
  bulletSpaceAfter = EFFECT_BULLET_SPACE_AFTER,
): Promise<string> {
  let cursorX = 0;
  let markup = "";
  const bulletRadius = Math.max(1, (bulletWidth - bulletSpaceAfter) / 2);

  for (const token of splitDrawableBulletText(line)) {
    if (token.type === "bullet") {
      markup += `<circle cx="${cursorX + bulletRadius}" cy="${y + bulletOffset - 1 - bulletRadius}" r="${bulletRadius}" class="effect-bullet" />`;
      cursorX += bulletWidth;
      continue;
    }

    markup += `<text x="${cursorX}" y="${y}" class="${className}" font-size="${fontSize}">${escapeXml(token.value)}</text>`;
    cursorX += await measureTextWidth(token.value, fontSize, font);
  }

  return markup;
}

async function textGroup(
  lines: string[],
  x: number,
  firstBaseline: number,
  fontSize: number,
  lineHeight: number,
  scaleX: number,
  className: string,
  font: CardFont,
  bulletWidth?: number,
  bulletOffset?: number,
  bulletSpaceAfter?: number,
): Promise<string> {
  const lineMarkup = await Promise.all(lines.map(async (line, index) => {
      const y = firstBaseline + index * lineHeight;
      const content = line.includes(EFFECT_BULLET) && bulletWidth
        ? await textLineWithDrawnBullets(line, y, fontSize, font, className, bulletWidth, bulletOffset, bulletSpaceAfter)
        : `<text x="0" y="${y}" class="${className}" font-size="${fontSize}">${escapeXml(line)}</text>`;

      return `<g transform="translate(${x}, 0) scale(${scaleX}, 1)">${content}</g>`;
    }));

  return lineMarkup.join("");
}

async function centeredTextGroup(
  textBlock: FittedTextBlock,
  box: { x: number; y: number; maxHeight: number },
  className: string,
): Promise<string> {
  const usedHeight = Math.max(textBlock.fontSize, textBlock.lines.length * textBlock.lineHeight);
  const firstBaseline = box.y + Math.max(0, (box.maxHeight - usedHeight) / 2) + textBlock.fontSize * 0.9;
  return textGroup(
    textBlock.lines,
    box.x,
    firstBaseline,
    textBlock.fontSize,
    textBlock.lineHeight,
    textBlock.scaleX,
    className,
    textBlock.font,
    textBlock.bulletWidth,
    textBlock.bulletOffset,
    textBlock.bulletSpaceAfter,
  );
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

function linkArrowPositions(markers?: string[], renderScale: RenderScale = 1): Array<{ index: string; left: number; top: number; width: number; height: number }> {
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
    return position ? [{ index, ...scaleBox(position, renderScale) }] : [];
  });
}

function spellTrapSubfamilyPlacement(layout: CardLayout, renderScale: RenderScale = 1): { iconLeft: number; iconTop: number; closeBracketX: number; textRightX: number } {
  const closeBracketX = Math.round(Math.min(layout.spellTrapTypeNoSubfamily.rightX - scaledNumber(20, renderScale), layout.width - scaledNumber(92, renderScale)));
  const iconLeft = Math.round(closeBracketX - layout.subfamily.size - scaledNumber(SPELL_TRAP_SUBFAMILY_BRACKET_GAP, renderScale));

  return {
    iconLeft,
    iconTop: Math.round(layout.subfamily.y),
    closeBracketX,
    textRightX: iconLeft - scaledNumber(SPELL_TRAP_SUBFAMILY_TEXT_GAP, renderScale),
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

async function buildImageAsset(relativePath: string, width?: number, height?: number, renderScale: RenderScale = 1): Promise<Buffer> {
  const filePath = assetPath(relativePath);
  const image = sharp(filePath);
  if (width && height) {
    return image.resize(Math.round(width), Math.round(height), { fit: "fill", kernel: sharp.kernel.lanczos3 }).png().toBuffer();
  }

  if (renderScale > 1) {
    const metadata = await sharp(filePath).metadata();
    if (metadata.width && metadata.height) {
      return image
        .resize(scaledInteger(metadata.width, renderScale), scaledInteger(metadata.height, renderScale), { fit: "fill", kernel: sharp.kernel.lanczos3 })
        .png()
        .toBuffer();
    }
  }

  return image.png().toBuffer();
}

async function buildImageAssetWithClearedArea(
  relativePath: string,
  clearArea: { left: number; top: number; width: number; height: number },
  width: number = DEFAULT_CARD_LAYOUT.width,
  height: number = DEFAULT_CARD_LAYOUT.height,
): Promise<Buffer> {
  const clearMask = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${clearArea.left}" y="${clearArea.top}" width="${clearArea.width}" height="${clearArea.height}" fill="white" />
    </svg>
  `);

  return sharp(await buildImageAsset(relativePath, width, height))
    .ensureAlpha()
    .composite([{ input: clearMask, blend: "dest-out" }])
    .png()
    .toBuffer();
}

async function buildPendulumBorderAsset(renderScale: RenderScale = 1): Promise<Buffer> {
  const width = scaledInteger(DEFAULT_CARD_LAYOUT.width, renderScale);
  const height = scaledInteger(DEFAULT_CARD_LAYOUT.height, renderScale);
  const border = scaleBox(PENDULUM_BORDER, renderScale);
  const clearTopMask = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${scaledInteger(PENDULUM_ARTLESS_BORDER_CLEAR_HEIGHT, renderScale)}" fill="white" />
    </svg>
  `);

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await buildImageAsset("frame-pendulum/border-pendulum-medium-base-artless.png", undefined, undefined, renderScale),
        left: Math.round(border.x),
        top: Math.round(border.y),
      },
      {
        input: clearTopMask,
        blend: "dest-out",
      },
      {
        input: await buildImageAsset("frame-pendulum/border-pendulum-medium-base.png", undefined, undefined, renderScale),
        left: Math.round(border.x),
        top: Math.round(border.y),
      },
    ])
    .png()
    .toBuffer();
}

async function buildImagePatch(relativePath: string, left: number, top: number, width: number, height: number, renderScale: RenderScale = 1): Promise<Buffer> {
  return sharp(assetPath(relativePath))
    .resize(scaledInteger(DEFAULT_CARD_LAYOUT.width, renderScale), scaledInteger(DEFAULT_CARD_LAYOUT.height, renderScale), { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .extract({ left, top, width, height })
    .png()
    .toBuffer();
}

async function optionalAsset(relativePath: string, width?: number, height?: number, renderScale: RenderScale = 1): Promise<Buffer | null> {
  try {
    await fs.access(assetPath(relativePath));
    return buildImageAsset(relativePath, width, height, renderScale);
  } catch {
    return null;
  }
}

async function buildTextOverlay(card: NormalizedCard, layout: CardLayout, renderScale: RenderScale = 1): Promise<Buffer> {
  const isPendulum = isPendulumCard(card);
  const frame = frameKey(card.frameType);
  const pendulumEffectText = scaleBox(PENDULUM_EFFECT_TEXT, renderScale);
  const pendulumScale = scaleBox(PENDULUM_SCALE, renderScale);
  const renderedName = card.name;
  const nameMaxWidth = Math.max(
    scaledNumber(180, renderScale),
    Math.min(layout.name.maxWidth, layout.attribute.x - layout.name.x - scaledNumber(48, renderScale)),
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
  const spellTrapSubfamily = spellTrapSubfamilyPlacement(layout, renderScale);
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
  const statSeparatorY = layout.atkDef.y - scaledNumber(EFFECT_STAT_SEPARATOR.yOffsetFromAtkBaseline, renderScale);
  const descriptionMaxHeight = isMonster(card)
    ? Math.max(
        descLayout.lineHeight,
        statSeparatorY - scaledNumber(EFFECT_STAT_SEPARATOR.textGap, renderScale) - descLayout.y,
      )
    : descLayout.maxHeight;
  const description = await fitTextBlock(
    card.desc,
    descLayout.maxWidth,
    descriptionMaxHeight,
    descFont,
    scaleFontList(descFontList, renderScale),
  );
  const pendulumDescription = isPendulum && card.pendulumDescription
    ? await fitTextBlock(
        card.pendulumDescription,
        pendulumEffectText.maxWidth,
        pendulumEffectText.maxHeight,
        CARD_FONTS.effect,
        scaleFontList(PENDULUM_EFFECT_FONT_LIST_TCG, renderScale),
      )
    : null;
  const atk = await fitSingleLine(statText(card.atk), scaledNumber(74, renderScale), layout.atkDef.fontSize, scaledNumber(22, renderScale), CARD_FONTS.statNumber, 0.7);
  const def = await fitSingleLine(
    frame === "link" ? statText(card.linkval ?? null) : statText(card.def),
    scaledNumber(74, renderScale),
    layout.atkDef.fontSize,
    scaledNumber(22, renderScale),
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

  const pendulumDescriptionText = pendulumDescription
    ? await centeredTextGroup(pendulumDescription, pendulumEffectText, "effect")
    : "";
  const descriptionText = await textGroup(
    description.lines,
    descLayout.x,
    descLayout.y,
    description.fontSize,
    description.lineHeight,
    description.scaleX,
    "effect",
    description.font,
    description.bulletWidth,
    description.bulletOffset,
    description.bulletSpaceAfter,
  );
  const statSeparatorLine = isMonster(card)
    ? `<line x1="${scaledNumber(EFFECT_STAT_SEPARATOR.leftX, renderScale)}" y1="${statSeparatorY}" x2="${scaledNumber(EFFECT_STAT_SEPARATOR.rightX, renderScale)}" y2="${statSeparatorY}" class="stat-separator" stroke-width="${scaledNumber(EFFECT_STAT_SEPARATOR.strokeWidth, renderScale)}" />`
    : "";
  const statLine = isMonster(card)
    ? `
      <text x="${scaledNumber(432.1, renderScale)}" y="${layout.atkDef.y}" class="stat-label" font-size="${scaledNumber(35.73, renderScale)}">ATK/</text>
      ${compressedText(statText(card.atk), scaledNumber(581.8, renderScale), layout.atkDef.y + scaledNumber(0.5, renderScale), atk, "stat-value", "end")}
      <text x="${scaledNumber(frame === "link" ? 593 : 600.85, renderScale)}" y="${layout.atkDef.y}" class="stat-label" font-size="${scaledNumber(35.73, renderScale)}">${frame === "link" ? "LINK/" : "DEF/"}</text>
      ${compressedText(frame === "link" ? statText(card.linkval ?? null) : statText(card.def), scaledNumber(747.8, renderScale), layout.atkDef.y + scaledNumber(0.5, renderScale), def, "stat-value", "end")}
    `
    : "";

  const svg = `
    <svg width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        ${cardFontCss()}
        .name {
          fill: ${hasDarkNameBackground(card) ? LIGHT_TEXT_COLOR : TEXT_COLOR};
          stroke: ${hasDarkNameBackground(card) ? LIGHT_TEXT_COLOR : TEXT_COLOR};
          stroke-width: ${scaledNumber(0.25, renderScale)};
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
        .effect-bullet {
          fill: ${TEXT_COLOR};
        }
        .stat-separator {
          stroke: ${TEXT_COLOR};
          stroke-linecap: square;
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
      ${pendulumDescriptionText}
      ${isPendulum ? `
        <text x="${pendulumScale.blueX}" y="${pendulumScale.y}" class="pendulum-scale" font-size="${pendulumScale.fontSize}">${escapeXml(statText(card.pendulumScale ?? 0))}</text>
        <text x="${pendulumScale.redX}" y="${pendulumScale.y}" class="pendulum-scale" font-size="${pendulumScale.fontSize}">${escapeXml(statText(card.pendulumScale ?? 0))}</text>
      ` : ""}
      ${descriptionText}
      ${statSeparatorLine}
      ${statLine}
    </svg>
  `;

  return Buffer.from(svg);
}

export async function renderCardImage(
  card: NormalizedCard,
  sourceImageBuffer: Buffer,
  layout: CardLayout = DEFAULT_CARD_LAYOUT,
  options: RenderCardImageOptions = {},
): Promise<RenderedCard> {
  if (!card.isSupported) {
    throw new Error(card.unsupportedReason ?? "Tipo de carta nao suportado.");
  }

  if (!sourceImageBuffer.length) {
    throw new Error("Imagem da carta nao encontrada.");
  }

  await warmUpCardFonts();

  const frame = frameKey(card.frameType);
  const isPendulum = isPendulumCard(card);
  const renderScale = options.scale ?? 1;
  const renderLayout = scaleLayout(layout, renderScale);
  const pendulumArtwork = scaleBox(PENDULUM_ARTWORK, renderScale);
  const pendulumClearArea = scaleBox(PENDULUM_CLEAR_AREA, renderScale);
  const pendulumEffectBackground = scaleBox(PENDULUM_EFFECT_BACKGROUND, renderScale);
  const pendulumScaleIcon = scaleBox(PENDULUM_SCALE_ICON, renderScale);
  const bottomFrame = isPendulum ? pendulumBottomFrameKey() : frame;
  const artworkLayout = isPendulum ? pendulumArtwork : renderLayout.artwork;
  const artworkPipeline = sharp(sourceImageBuffer)
    .resize(Math.round(artworkLayout.width), Math.round(artworkLayout.height), {
      fit: "cover",
      position: isPendulum ? "north" : "center",
      kernel: sharp.kernel.lanczos3,
    });
  if (renderScale > 1) {
    artworkPipeline.sharpen({ sigma: 0.6, m1: 0.4, m2: 1.2 });
  }
  const artworkBuffer = await artworkPipeline
    .png()
    .toBuffer();
  const composites: sharp.OverlayOptions[] = [
    {
      input: artworkBuffer,
      left: Math.round(artworkLayout.x),
      top: Math.round(artworkLayout.y),
    },
    {
      input: isPendulum
        ? await buildImageAssetWithClearedArea(`frame/frame-${frame}.png`, pendulumClearArea, renderLayout.width, renderLayout.height)
        : await buildImageAsset(`frame/frame-${frame}.png`, renderLayout.width, renderLayout.height),
      left: 0,
      top: 0,
    },
  ];

  if (isPendulum) {
    composites.push({
      input: await buildImageAsset(`frame-pendulum/frame-pendulum-${bottomFrame}.png`, renderLayout.width, renderLayout.height),
      left: 0,
      top: 0,
    });
  }

  const cardBorder = await optionalAsset("frame/card-border-normal.png", renderLayout.width, renderLayout.height);
  if (cardBorder) composites.push({ input: cardBorder, left: 0, top: 0 });

  if (isPendulum) {
    composites.push({
      input: artworkBuffer,
      left: Math.round(artworkLayout.x),
      top: Math.round(artworkLayout.y),
    });
  }

  const nameBackground = await optionalAsset(`background/background-name-${frame}.png`, undefined, undefined, renderScale);
  if (nameBackground) composites.push({ input: nameBackground, left: 0, top: 0 });

  const effectBackground = await optionalAsset(`background/background-text-${bottomFrame}.png`, undefined, undefined, renderScale);
  if (effectBackground) composites.push({ input: effectBackground, left: scaledInteger(54, renderScale), top: scaledInteger(884, renderScale) });

  if (isPendulum) {
    const pendulumBackground = await optionalAsset(
      `background/background-pendulum-${bottomFrame}.png`,
      pendulumEffectBackground.width,
      pendulumEffectBackground.height,
    );
    if (pendulumBackground) {
      composites.push({
        input: pendulumBackground,
        left: Math.round(pendulumEffectBackground.x),
        top: Math.round(pendulumEffectBackground.y),
      });
    }
  }

  if (!isPendulum) {
    const effectBorder = await optionalAsset("frame/effect-border-base.png", undefined, undefined, renderScale);
    if (effectBorder) composites.push({ input: effectBorder, left: scaledInteger(35, renderScale), top: scaledInteger(860, renderScale) });
  }

  if (isPendulum) {
    const pendulumScaleIconAsset = await optionalAsset("frame-pendulum/pendulum-scale-medium.png", undefined, undefined, renderScale);
    if (pendulumScaleIconAsset) {
      composites.push({
        input: pendulumScaleIconAsset,
        left: Math.round(pendulumScaleIcon.x),
        top: Math.round(pendulumScaleIcon.y),
      });
    }

    composites.push({
      input: await buildPendulumBorderAsset(renderScale),
      left: 0,
      top: 0,
    });
  } else {
    const artBorderSource = frame === "xyz" ? "frame/art-border-xyz.png" : "frame/art-border-base.png";
    const artBorder = await optionalAsset(artBorderSource, undefined, undefined, renderScale);
    if (artBorder) composites.push({ input: artBorder, left: scaledInteger(60, renderScale), top: scaledInteger(170, renderScale) });
  }

  if (frame === "link") {
    for (const arrow of linkArrowPositions(card.linkmarkers, renderScale)) {
      const base = await optionalAsset(`link/link-inactive-${arrow.index}-base.png`, arrow.width, arrow.height);
      const core = await optionalAsset(`link/link-inactive-${arrow.index}-core.png`, arrow.width, arrow.height);
      const activeBase = await optionalAsset(`link/link-active-${arrow.index}-base.png`, arrow.width, arrow.height);
      const activeCore = await optionalAsset(`link/link-active-${arrow.index}-core.png`, arrow.width, arrow.height);
      if (base) composites.push({ input: base, left: Math.round(arrow.left), top: Math.round(arrow.top) });
      if (core) composites.push({ input: core, left: Math.round(arrow.left), top: Math.round(arrow.top) });
      if (activeBase) composites.push({ input: activeBase, left: Math.round(arrow.left), top: Math.round(arrow.top) });
      if (activeCore) composites.push({ input: activeCore, left: Math.round(arrow.left), top: Math.round(arrow.top) });
    }
  }

  const nameBorder = await optionalAsset(frame === "xyz" ? "frame/name-border-xyz.png" : "frame/name-border-normal.png", undefined, undefined, renderScale);
  if (nameBorder) composites.push({ input: nameBorder, left: 0, top: 0 });

  const frameBorder = await optionalAsset(frame === "xyz" ? "frame/frame-border-xyz.png" : "frame/frame-border-normal.png", renderLayout.width, renderLayout.height);
  if (frameBorder) composites.push({ input: frameBorder, left: 0, top: 0 });

  if (isPendulum && frame !== "xyz") {
    const pendulumFrameBorder = await optionalAsset("frame/frame-border-pendulum.png", renderLayout.width, renderLayout.height);
    if (pendulumFrameBorder) composites.push({ input: pendulumFrameBorder, left: 0, top: 0 });
  }

  if (card.attributeIconPath) {
    const attributePatch = {
      left: Math.max(0, Math.round(renderLayout.attribute.x - scaledNumber(22, renderScale))),
      top: Math.max(0, Math.round(renderLayout.attribute.y - scaledNumber(12, renderScale))),
      width: Math.min(renderLayout.width - Math.round(renderLayout.attribute.x - scaledNumber(22, renderScale)), Math.round(renderLayout.attribute.size + scaledNumber(44, renderScale))),
      height: Math.min(renderLayout.height - Math.round(renderLayout.attribute.y - scaledNumber(12, renderScale)), Math.round(renderLayout.attribute.size + scaledNumber(24, renderScale))),
    };
    composites.push({
      input: await buildImagePatch(`frame/frame-${frame}.png`, attributePatch.left, attributePatch.top, attributePatch.width, attributePatch.height, renderScale),
      left: attributePatch.left,
      top: attributePatch.top,
    });
  }

  if (card.attributeIconPath) {
    composites.push({
      input: await buildAttributeIconAsset(card.attributeIconPath, renderLayout.attribute.size),
      left: Math.round(renderLayout.attribute.x),
      top: Math.round(renderLayout.attribute.y),
    });
  }

  if (card.subfamilyIconPath && isSpellOrTrap(card)) {
    const spellTrapSubfamily = spellTrapSubfamilyPlacement(renderLayout, renderScale);
    composites.push({
      input: await buildResizedAsset(card.subfamilyIconPath, renderLayout.subfamily.size, renderLayout.subfamily.size),
      left: spellTrapSubfamily.iconLeft,
      top: spellTrapSubfamily.iconTop,
    });
  }

  const starPath = frame === "xyz"
    ? assetPublicPath("subfamily/subfamily-rank.png")
    : assetPublicPath("subfamily/subfamily-level.png");
  const starSize = frame === "xyz" ? renderLayout.rankStars.size : renderLayout.stars.size;
  const starBuffer = await buildResizedAsset(starPath, starSize, starSize);
  composites.push(
    ...starPositions(card, renderLayout).map((position) => ({
      input: starBuffer,
      left: Math.round(position.left),
      top: Math.round(position.top),
    })),
  );

  composites.push({
    input: await buildTextOverlay(card, renderLayout, renderScale),
    left: 0,
    top: 0,
  });

  const renderedBuffer = await sharp({
    create: {
      width: renderLayout.width,
      height: renderLayout.height,
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
