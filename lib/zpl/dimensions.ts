import { env } from "@/lib/env";
import {
  DEFAULT_PAPER_SIZE,
  parsePaperSizes,
  sizeById,
} from "@/lib/paper-sizes";

export function dotsFromMm(millimeters: number): number {
  return Math.round((millimeters * env.ZPL_RESOLUTION_DPI) / 25.4);
}

export function getPaperSizes() {
  return parsePaperSizes(env.ZPL_PAPER_SIZES, DEFAULT_PAPER_SIZE);
}

export function resolveDimensions(paperId: string | undefined): {
  widthDots: number;
  heightDots: number;
} {
  const sizes = getPaperSizes();
  const size = paperId ? sizeById(paperId, sizes) : sizes[0];
  if (!size) {
    throw new Error("Aucun format de papier disponible.");
  }
  return {
    widthDots: dotsFromMm(size.widthMm),
    heightDots: dotsFromMm(size.heightMm),
  };
}