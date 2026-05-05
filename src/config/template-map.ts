import type { SupportedFrameType } from "@/types/card.types";

export const TEMPLATE_MAP: Record<SupportedFrameType, string> = {
  normal: "/assets/ygocarder/asset/image/frame/frame-normal.png",
  effect: "/assets/ygocarder/asset/image/frame/frame-effect.png",
  ritual: "/assets/ygocarder/asset/image/frame/frame-ritual.png",
  fusion: "/assets/ygocarder/asset/image/frame/frame-fusion.png",
  synchro: "/assets/ygocarder/asset/image/frame/frame-synchro.png",
  xyz: "/assets/ygocarder/asset/image/frame/frame-xyz.png",
  link: "/assets/ygocarder/asset/image/frame/frame-link.png",
  spell: "/assets/ygocarder/asset/image/frame/frame-spell.png",
  trap: "/assets/ygocarder/asset/image/frame/frame-trap.png",
};

function baseFrameType(frameType: string): string {
  const key = frameType.toLowerCase();
  if (key.endsWith("_pendulum")) return key.replace("_pendulum", "");
  if (key.startsWith("pendulum_")) return key.replace("pendulum_", "");
  return key;
}

export function getTemplateByFrameType(frameType: string): string | null {
  const key = baseFrameType(frameType);
  if (key in TEMPLATE_MAP) {
    return TEMPLATE_MAP[key as SupportedFrameType];
  }

  return null;
}
