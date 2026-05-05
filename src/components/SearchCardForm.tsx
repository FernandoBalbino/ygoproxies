"use client";

import { Search } from "lucide-react";
import { FormEvent } from "react";

interface SearchCardFormProps {
  query: string;
  language: "pt" | "en";
  isLoading: boolean;
  onQueryChange: (value: string) => void;
  onLanguageChange: (value: "pt" | "en") => void;
  onSearch: () => void;
}

export function SearchCardForm({ query, language, isLoading, onQueryChange, onLanguageChange, onSearch }: SearchCardFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <select
        value={language}
        onChange={(event) => onLanguageChange(event.target.value as "pt" | "en")}
        disabled={isLoading}
        className="min-h-12 rounded-lg border border-stone-300 bg-stone-100 px-3 text-sm font-bold text-stone-700 outline-none transition focus:border-emerald-800 disabled:opacity-50"
        title="Idioma"
      >
        <option value="pt">PT</option>
        <option value="en">EN</option>
      </select>
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Nome da carta"
        className="min-h-12 flex-1 rounded-lg border border-stone-300 bg-white px-4 text-base text-stone-950 outline-none ring-emerald-800/20 transition focus:border-emerald-800 focus:ring-4"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg bg-stone-950 px-4 text-white shadow-card transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-stone-400"
        aria-label="Buscar"
        title="Buscar"
      >
        <Search size={21} />
      </button>
    </form>
  );
}
