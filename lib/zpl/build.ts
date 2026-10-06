import { computeBarcodeLayout } from "@/lib/zpl/layout";
import { computeRotatedEan13Box } from "@/lib/zpl/rotated-layout";

export interface BuildEan13ZplInput {
  ean13: string;
  quantity: number;
  widthDots: number;
  heightDots: number;
  rotated?: boolean;
}

export const DATA_MODULES = 95;
const QUIET_LEFT_MODULES = 11;
const QUIET_RIGHT_MODULES = 7;
const TOTAL_MODULES = DATA_MODULES + QUIET_LEFT_MODULES + QUIET_RIGHT_MODULES;
export const MIN_MODULE_WIDTH = 2;
const MAX_MODULE_WIDTH = 5;
const TEXT_HEIGHT_DOTS = 25;
const TARGET_HEIGHT_COVERAGE = 0.9;
const MIN_BAR_HEIGHT_DOTS = 146;

export function buildEan13Zpl({
  ean13,
  quantity,
  widthDots,
  heightDots,
  rotated = false,
}: BuildEan13ZplInput): string {
  const dataDigits = ean13.slice(0, 12);

  const layout = computeBarcodeLayout({
    widthDots: rotated ? heightDots : widthDots,
    heightDots: rotated ? widthDots : heightDots,
    totalModules: TOTAL_MODULES,
    symbolModules: DATA_MODULES,
    minModuleWidth: MIN_MODULE_WIDTH,
    maxModuleWidth: MAX_MODULE_WIDTH,
    textHeightDots: TEXT_HEIGHT_DOTS,
    targetHeightCoverage: TARGET_HEIGHT_COVERAGE,
    minBarHeightDots: MIN_BAR_HEIGHT_DOTS,
  });

  const box = rotated
    ? computeRotatedEan13Box(widthDots, heightDots, layout)
    : null;
  const barcodeField = rotated
    ? `^FO${box?.x},${box?.y}^BEB,${box?.barHeight},Y,N`
    : `^FO${layout.x},${layout.y}^BEN,${layout.barHeight},Y,N`;

  return [
    "^XA",
    `^PW${widthDots}^LL${heightDots}`,
    "^LH0,0",
    `^BY${layout.moduleWidth},3,${layout.barHeight}`,
    barcodeField,
    `^FD${dataDigits}^FS`,
    `^PQ${quantity}`,
    "^XZ",
  ].join("\r\n");
}