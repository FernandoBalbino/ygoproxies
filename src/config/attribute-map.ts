export const ATTRIBUTE_ICON_MAP: Record<string, string> = {
  DARK: "/assets/ygocarder/asset/image/attribute/attr-pt-dark.png",
  DIVINE: "/assets/ygocarder/asset/image/attribute/attr-pt-divine.png",
  EARTH: "/assets/ygocarder/asset/image/attribute/attr-pt-earth.png",
  FIRE: "/assets/ygocarder/asset/image/attribute/attr-pt-fire.png",
  LIGHT: "/assets/ygocarder/asset/image/attribute/attr-pt-light.png",
  SPELL: "/assets/ygocarder/asset/image/attribute/attr-pt-spell.png",
  TRAP: "/assets/ygocarder/asset/image/attribute/attr-pt-trap.png",
  WATER: "/assets/ygocarder/asset/image/attribute/attr-pt-water.png",
  WIND: "/assets/ygocarder/asset/image/attribute/attr-pt-wind.png",
};

export function getAttributeIconPath(attribute?: string | null, frameType?: string): string | null {
  if (frameType === "spell") {
    return ATTRIBUTE_ICON_MAP.SPELL;
  }

  if (frameType === "trap") {
    return ATTRIBUTE_ICON_MAP.TRAP;
  }

  if (!attribute) {
    return null;
  }

  return ATTRIBUTE_ICON_MAP[attribute.toUpperCase()] ?? null;
}
