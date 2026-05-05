"use client";

import { useEffect, useState } from "react";

export function SearchHintModal() {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-stone-950/55 px-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-hint-title"
        className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-5 text-center shadow-[0_24px_60px_rgba(0,0,0,0.32)]"
      >
        <h2 id="search-hint-title" className="text-xl font-black text-stone-950">Dica de busca</h2>
        <p className="mt-2 text-sm font-bold leading-snug text-stone-600">
          Se nao achar em portugues, tente o nome em ingles. Usamos a base completa do YGOPro.
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-800 px-4 text-sm font-black text-white active:scale-[0.98]"
        >
          Entendi
        </button>
      </section>
    </div>
  );
}
