import { getAttributeIconPath } from "@/config/attribute-map";
import { getDeckType, getUnsupportedReason } from "@/config/deck-rules";
import { getSubfamilyIconPath } from "@/config/subfamily-map";
import { getTemplateByFrameType } from "@/config/template-map";
import type { NormalizedCard } from "@/types/card.types";
import type { YgoProCard } from "@/types/ygopro.types";

const TYPE_TRANSLATIONS: Record<string, string> = {
  "Normal Monster": "Monstro Normal",
  "Normal Tuner Monster": "Monstro Normal Regulador",
  "Effect Monster": "Monstro de Efeito",
  "Flip Effect Monster": "Monstro de Efeito Flip",
  "Flip Tuner Effect Monster": "Monstro Regulador Flip",
  "Gemini Monster": "Monstro Gemini",
  "Spirit Monster": "Monstro Spirit",
  "Toon Monster": "Monstro Toon",
  "Tuner Monster": "Monstro Regulador",
  "Union Effect Monster": "Monstro Union",
  "Ritual Monster": "Monstro Ritual",
  "Ritual Effect Monster": "Monstro Ritual de Efeito",
  "Fusion Monster": "Monstro de Fusão",
  "Pendulum Normal Monster": "Monstro Pendulo Normal",
  "Pendulum Effect Monster": "Monstro Pendulo de Efeito",
  "Pendulum Effect Fusion Monster": "Monstro Pendulo de Fusao",
  "Pendulum Effect Ritual Monster": "Monstro Pendulo Ritual",
  "Pendulum Effect Synchro Monster": "Monstro Pendulo Sincro",
  "Pendulum Effect Xyz Monster": "Monstro Pendulo XYZ",
  "Synchro Monster": "Monstro Sincro",
  "Synchro Tuner Monster": "Monstro Sincro Regulador",
  "XYZ Monster": "Monstro XYZ",
  "Link Monster": "Monstro Link",
  "Spell Card": "Carta de Magia",
  "Trap Card": "Carta de Armadilha",
};

const RACE_TRANSLATIONS: Record<string, string> = {
  Aqua: "Aqua",
  Beast: "Besta",
  "Beast-Warrior": "Besta-Guerreira",
  "Creator-God": "Deus Criador",
  Cyberse: "Ciberso",
  Dinosaur: "Dinossauro",
  "Divine-Beast": "Besta Divina",
  Dragon: "Dragão",
  Fairy: "Fada",
  Fiend: "Demônio",
  Fish: "Peixe",
  Insect: "Inseto",
  Machine: "Máquina",
  Plant: "Planta",
  Psychic: "Psíquico",
  Pyro: "Piro",
  Reptile: "Réptil",
  Rock: "Rocha",
  "Sea Serpent": "Serpente Marinha",
  Spellcaster: "Mago",
  Thunder: "Trovão",
  Warrior: "Guerreiro",
  "Winged Beast": "Besta Alada",
  Wyrm: "Wyrm",
  Zombie: "Zumbi",
  Normal: "Normal",
  Field: "Campo",
  Equip: "Equipamento",
  Continuous: "Contínua",
  "Quick-Play": "Rápida",
  Ritual: "Ritual",
  Counter: "Contra-Armadilha",
};

const TYPELINE_TRANSLATIONS: Record<string, string> = {
  Normal: "Normal",
  Effect: "Efeito",
  Fusion: "Fusão",
  Synchro: "Sincro",
  Xyz: "XYZ",
  XYZ: "XYZ",
  Link: "Link",
  Ritual: "Ritual",
  Tuner: "Regulador",
  Flip: "Flip",
  Gemini: "Gemini",
  Spirit: "Spirit",
  Toon: "Toon",
  Union: "Union",
  Pendulum: "Pendulo",
};

function translateTerm(value: string, dictionary: Record<string, string>): string {
  return dictionary[value] ?? value;
}

function translateTypelineTerm(value: string): string {
  return TYPELINE_TRANSLATIONS[value] ?? RACE_TRANSLATIONS[value] ?? value;
}

function normalizeTypeline(card: YgoProCard, language: "pt" | "en"): string[] {
  if (card.frameType === "spell" || card.frameType === "trap") {
    if (card.race && card.race !== "Normal") {
      return language === "pt" ? [translateTerm(card.race, RACE_TRANSLATIONS)] : [card.race];
    }
    return [];
  }

  if (card.typeline?.length) {
    return language === "pt" ? card.typeline.map(translateTypelineTerm) : card.typeline;
  }

  const race = card.race ? (language === "pt" ? [translateTerm(card.race, RACE_TRANSLATIONS)] : [card.race]) : [];
  const typePieces = card.type
    .replace(" Monster", "")
    .split(" ")
    .filter(Boolean);
  
  const formattedPieces = language === "pt" 
    ? typePieces.map((term) => translateTerm(term, TYPELINE_TRANSLATIONS))
    : typePieces;

  return [...race, ...formattedPieces];
}

function isPendulumCard(card: YgoProCard): boolean {
  return card.frameType.toLowerCase().includes("pendulum")
    || card.type.toLowerCase().includes("pendulum")
    || card.typeline?.some((type) => type.toLowerCase() === "pendulum") === true;
}

function stripYgoQuotes(value?: string): string {
  return value?.replaceAll(/^''|''$/g, "").trim() ?? "";
}

function splitPendulumDescription(description: string): { monsterDescription: string; pendulumDescription: string } {
  const normalized = description.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const match = normalized.match(/\[?\s*Pendulum Effect\s*\]?\n([\s\S]*?)\n\[?\s*Monster Effect\s*\]?\n([\s\S]*)/i);

  if (!match) {
    return {
      monsterDescription: normalized,
      pendulumDescription: "",
    };
  }

  return {
    pendulumDescription: match[1]?.trim() ?? "",
    monsterDescription: match[2]?.trim() ?? normalized,
  };
}

function normalizeDescriptions(card: YgoProCard): { monsterDescription: string; pendulumDescription?: string } {
  if (!isPendulumCard(card)) {
    return { monsterDescription: card.desc };
  }

  const fallback = splitPendulumDescription(card.desc);
  return {
    monsterDescription: stripYgoQuotes(card.monster_desc) || fallback.monsterDescription,
    pendulumDescription: stripYgoQuotes(card.pend_desc) || fallback.pendulumDescription,
  };
}

export function translateCardData(card: YgoProCard): YgoProCard {
  return card;
}

export function normalizeCardDataToPortuguese(card: YgoProCard): NormalizedCard {
  return normalizeCardData(card, "pt");
}

export function normalizeCardData(card: YgoProCard, language: "pt" | "en" = "pt"): NormalizedCard {
  const firstImage = card.card_images?.[0];
  const frameType = card.frameType.toLowerCase();
  const descriptions = normalizeDescriptions(card);
  const croppedImageUrl = firstImage?.image_url_cropped ?? firstImage?.image_url ?? "";
  const unsupportedReason = getUnsupportedReason(card.type, frameType);
  const isSupported = !unsupportedReason;
  const deckType = isSupported ? getDeckType(card.type, frameType) : undefined;

  return {
    id: card.id,
    imageId: firstImage?.id ?? card.id,
    name: card.name,
    originalName: card.name_en,
    desc: descriptions.monsterDescription,
    pendulumDescription: descriptions.pendulumDescription,
    type: language === "pt" ? translateTerm(card.type, TYPE_TRANSLATIONS) : card.type,
    humanReadableCardType: language === "pt" ? translateTerm(card.humanReadableCardType ?? card.type, TYPE_TRANSLATIONS) : (card.humanReadableCardType ?? card.type),
    frameType,
    race: card.race ? (language === "pt" ? translateTerm(card.race, RACE_TRANSLATIONS) : card.race) : undefined,
    typeline: normalizeTypeline(card, language),
    atk: card.atk ?? null,
    def: card.def ?? null,
    level: card.level ?? null,
    pendulumScale: card.scale ?? null,
    attribute: card.attribute ?? null,
    linkval: card.linkval ?? null,
    linkmarkers: card.linkmarkers ?? [],
    croppedImageUrl,
    fullImageUrl: firstImage?.image_url,
    templatePath: isSupported ? getTemplateByFrameType(frameType) ?? undefined : undefined,
    attributeIconPath: isSupported ? getAttributeIconPath(card.attribute, frameType) ?? undefined : undefined,
    subfamilyIconPath: isSupported ? getSubfamilyIconPath(card.race) ?? undefined : undefined,
    deckType,
    isSupported,
    unsupportedReason,
  };
}
