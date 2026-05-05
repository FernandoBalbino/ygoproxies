export const SUBFAMILY_ICON_MAP: Record<string, string> = {
  CONTINUOUS: "/assets/ygocarder/asset/image/subfamily/subfamily-continuous.png",
  COUNTER: "/assets/ygocarder/asset/image/subfamily/subfamily-counter.png",
  EQUIP: "/assets/ygocarder/asset/image/subfamily/subfamily-equip.png",
  FIELD: "/assets/ygocarder/asset/image/subfamily/subfamily-field.png",
  "QUICK-PLAY": "/assets/ygocarder/asset/image/subfamily/subfamily-quick-play.png",
  RITUAL: "/assets/ygocarder/asset/image/subfamily/subfamily-ritual.png",
};

const SUBFAMILY_ALIASES: Record<string, string> = {
  CONTINUA: "CONTINUOUS",
  CONTINUA_: "CONTINUOUS",
  CONTINUA_ACENTO: "CONTINUOUS",
  CONTINUA_PT: "CONTINUOUS",
  CONTINUOUS: "CONTINUOUS",
  COUNTER: "COUNTER",
  CONTRA_ARMADILHA: "COUNTER",
  EQUIP: "EQUIP",
  EQUIPAMENTO: "EQUIP",
  FIELD: "FIELD",
  CAMPO: "FIELD",
  "QUICK-PLAY": "QUICK-PLAY",
  RAPIDA: "QUICK-PLAY",
  RITUAL: "RITUAL",
};

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/\//g, "_");
}

export function getSubfamilyIconPath(race?: string | null): string | null {
  if (!race || race.toLowerCase() === "normal") {
    return null;
  }

  const raw = race.toUpperCase();
  const normalized = normalizeKey(race);
  const mapped = SUBFAMILY_ALIASES[raw] ?? SUBFAMILY_ALIASES[normalized] ?? raw;

  return SUBFAMILY_ICON_MAP[mapped] ?? null;
}
