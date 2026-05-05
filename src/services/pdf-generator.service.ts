import { PDFDocument } from "pdf-lib";
import { A4_SIZE_MM, CARD_SIZE_MM } from "@/config/card-layout";
import type { DeckCard } from "@/types/deck.types";

export type PdfQualityMode = "free" | "full-hd";

export interface PdfGenerationProgress {
  current: number;
  total: number;
  stage: "rendering" | "packing" | "saving";
}

const MM_TO_PT = 72 / 25.4;
const CARDS_PER_PAGE = 9;
const COLUMNS = 3;
const ROWS = 3;
const GAP_MM = 2;
const FREE_JPEG_QUALITY = 0.7;
const FULL_HD_RENDER_SCALE = 2;

async function getFullHdRenderedImageDataUrl(card: DeckCard, cache: Map<string, Promise<string>>): Promise<string> {
  const cacheKey = `${card.id}:${card.renderLanguage ?? "pt"}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = fetch("/api/generate-card", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cardId: card.id,
      language: card.renderLanguage ?? "pt",
      renderScale: FULL_HD_RENDER_SCALE,
    }),
  })
    .then(async (response) => {
      const payload = (await response.json()) as { card?: { renderedImageDataUrl?: string }; error?: string };

      if (!response.ok || !payload.card?.renderedImageDataUrl) {
        throw new Error(payload.error ?? `Falha ao gerar ${card.name} em FULL HD.`);
      }

      return payload.card.renderedImageDataUrl;
    });

  cache.set(cacheKey, request);
  return request;
}

function mmToPt(value: number): number {
  return value * MM_TO_PT;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const [, base64] = dataUrl.split(",");
  if (!base64) {
    throw new Error("Imagem renderizada inválida.");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Imagem renderizada invalida."));
    image.src = dataUrl;
  });
}

async function dataUrlToJpegBytes(dataUrl: string, quality: number): Promise<Uint8Array> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Nao foi possivel preparar a imagem do PDF.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Nao foi possivel comprimir a imagem."));
      }
    }, "image/jpeg", quality);
  });

  return blobToBytes(blob);
}

export async function generateDeckPdf(
  cards: DeckCard[],
  qualityMode: PdfQualityMode = "full-hd",
  onProgress?: (progress: PdfGenerationProgress) => void,
): Promise<Blob> {
  if (!cards.length) {
    throw new Error("Adicione pelo menos uma carta ao deck.");
  }

  const pdf = await PDFDocument.create();
  const fullHdRenderCache = new Map<string, Promise<string>>();
  const pageWidth = mmToPt(A4_SIZE_MM.width);
  const pageHeight = mmToPt(A4_SIZE_MM.height);
  const cardWidth = mmToPt(CARD_SIZE_MM.width);
  const cardHeight = mmToPt(CARD_SIZE_MM.height);
  const gap = mmToPt(GAP_MM);
  const gridWidth = cardWidth * COLUMNS + gap * (COLUMNS - 1);
  const gridHeight = cardHeight * ROWS + gap * (ROWS - 1);
  const marginX = (pageWidth - gridWidth) / 2;
  const marginTop = (pageHeight - gridHeight) / 2;

  for (let index = 0; index < cards.length; index += 1) {
    if (index % CARDS_PER_PAGE === 0) {
      pdf.addPage([pageWidth, pageHeight]);
    }

    const page = pdf.getPage(pdf.getPageCount() - 1);
    const pageIndex = index % CARDS_PER_PAGE;
    const column = pageIndex % COLUMNS;
    const row = Math.floor(pageIndex / COLUMNS);
    onProgress?.({
      current: index + 1,
      total: cards.length,
      stage: qualityMode === "free" ? "packing" : "rendering",
    });
    const renderedImageDataUrl = qualityMode === "free"
      ? cards[index].renderedImageDataUrl
      : await getFullHdRenderedImageDataUrl(cards[index], fullHdRenderCache);
    const image = qualityMode === "free"
      ? await pdf.embedJpg(await dataUrlToJpegBytes(renderedImageDataUrl, FREE_JPEG_QUALITY))
      : await pdf.embedPng(dataUrlToBytes(renderedImageDataUrl));

    page.drawImage(image, {
      x: marginX + column * (cardWidth + gap),
      y: pageHeight - marginTop - cardHeight - row * (cardHeight + gap),
      width: cardWidth,
      height: cardHeight,
    });
  }

  onProgress?.({ current: cards.length, total: cards.length, stage: "saving" });
  const pdfBytes = await pdf.save({ useObjectStreams: false });
  const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(pdfBuffer).set(pdfBytes);

  return new Blob([pdfBuffer], { type: "application/pdf" });
}

export async function downloadDeckPdf(
  cards: DeckCard[],
  qualityMode: PdfQualityMode = "full-hd",
  onProgress?: (progress: PdfGenerationProgress) => void,
): Promise<void> {
  const blob = await generateDeckPdf(cards, qualityMode, onProgress);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = qualityMode === "free" ? "yugioh-proxies-gratis.pdf" : "yugioh-proxies-full-hd.pdf";
  link.click();
  URL.revokeObjectURL(url);
}
