import { PDFDocument } from "pdf-lib";
import { A4_SIZE_MM, CARD_SIZE_MM } from "@/config/card-layout";
import type { DeckCard } from "@/types/deck.types";

const MM_TO_PT = 72 / 25.4;
const CARDS_PER_PAGE = 9;
const COLUMNS = 3;
const ROWS = 3;
const GAP_MM = 2;

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

export async function generateDeckPdf(cards: DeckCard[]): Promise<Blob> {
  if (!cards.length) {
    throw new Error("Adicione pelo menos uma carta ao deck.");
  }

  const pdf = await PDFDocument.create();
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
    const imageBytes = dataUrlToBytes(cards[index].renderedImageDataUrl);
    const image = await pdf.embedPng(imageBytes);

    page.drawImage(image, {
      x: marginX + column * (cardWidth + gap),
      y: pageHeight - marginTop - cardHeight - row * (cardHeight + gap),
      width: cardWidth,
      height: cardHeight,
    });
  }

  const pdfBytes = await pdf.save({ useObjectStreams: false });
  const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(pdfBuffer).set(pdfBytes);

  return new Blob([pdfBuffer], { type: "application/pdf" });
}

export async function downloadDeckPdf(cards: DeckCard[]): Promise<void> {
  const blob = await generateDeckPdf(cards);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "yugioh-proxies.pdf";
  link.click();
  URL.revokeObjectURL(url);
}
