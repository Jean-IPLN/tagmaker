import { computeBarcodeLayout } from "@/lib/zpl/layout";

export interface BuildEan13ZplInput {
  ean13: string;
  quantity: number;
  widthDots: number;
  heightDots: number;
}

const DATA_MODULES = 95;
const QUIET_LEFT_MODULES = 11;
const QUIET_RIGHT_MODULES = 7;
const TOTAL_MODULES = DATA_MODULES + QUIET_LEFT_MODULES + QUIET_RIGHT_MODULES;
const MIN_MODULE_WIDTH = 2;
const MAX_MODULE_WIDTH = 5;
const TEXT_HEIGHT_DOTS = 25;
const TARGET_HEIGHT_COVERAGE = 0.9;
const MIN_BAR_HEIGHT_DOTS = 146;

export function buildEan13Zpl({
  ean13,
  quantity,
  widthDots,
  heightDots,
}: BuildEan13ZplInput): string {
  const dataDigits = ean13.slice(0, 12);

  const { moduleWidth, x, barHeight, y } = computeBarcodeLayout({
    widthDots,
    heightDots,
    totalModules: TOTAL_MODULES,
    symbolModules: DATA_MODULES,
    minModuleWidth: MIN_MODULE_WIDTH,
    maxModuleWidth: MAX_MODULE_WIDTH,
    textHeightDots: TEXT_HEIGHT_DOTS,
    targetHeightCoverage: TARGET_HEIGHT_COVERAGE,
    minBarHeightDots: MIN_BAR_HEIGHT_DOTS,
  });

  return [
    "^XA",
    `^PW${widthDots}^LL${heightDots}`,
    "^LH0,0",
    `^BY${moduleWidth},3,${barHeight}`,
    `^FO${x},${y}^BEN,${barHeight},Y,N`,
    `^FD${dataDigits}^FS`,
    `^PQ${quantity}`,
    "^XZ",
  ].join("\r\n");
}