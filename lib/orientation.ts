import {
  DATA_MODULES as EAN13_SYMBOL_MODULES,
  MIN_MODULE_WIDTH as EAN13_MIN_MODULE_WIDTH,
} from "@/lib/zpl/build";
import {
  SYMBOL_MODULES as CODE128_SYMBOL_MODULES,
  MIN_MODULE_WIDTH as CODE128_MIN_MODULE_WIDTH,
} from "@/lib/zpl/location";

export function rotationThresholdModules(): number {
  return Math.max(
    EAN13_SYMBOL_MODULES * EAN13_MIN_MODULE_WIDTH,
    CODE128_SYMBOL_MODULES * CODE128_MIN_MODULE_WIDTH
  );
}

export function rotationShortSideThresholdMm(dpi: number): number {
  return (rotationThresholdModules() * 25.4) / dpi;
}

export function isRotatable(
  paperSize: { widthMm: number; heightMm: number },
  dpi: number
): boolean {
  const shortSideMm = Math.min(paperSize.widthMm, paperSize.heightMm);
  return shortSideMm >= rotationShortSideThresholdMm(dpi);
}