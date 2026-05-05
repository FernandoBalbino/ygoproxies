"use client";

import { FileDown } from "lucide-react";
import { useState } from "react";
import { downloadDeckPdf } from "@/services/pdf-generator.service";
import type { DeckCard } from "@/types/deck.types";

interface GeneratePdfButtonProps {
  cards: DeckCard[];
  onError: (message: string) => void;
}

export function GeneratePdfButton({ cards, onError }: GeneratePdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGeneratePdf() {
    setIsGenerating(true);
    onError("");

    try {
      await downloadDeckPdf(cards);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Falha ao gerar PDF.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleGeneratePdf}
      disabled={!cards.length || isGenerating}
      className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-red-800 px-5 py-4 text-base font-black text-white shadow-card transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-400"
    >
      <FileDown size={21} />
      {isGenerating ? "Gerando..." : "Gerar PDF"}
    </button>
  );
}
