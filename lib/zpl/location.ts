import { computeBarcodeLayout } from "@/lib/zpl/layout";

export interface BuildLocationZplInput {
  codes: string[];
  quantity?: number;
  widthDots: number;
  heightDots: number;
}

const CHAR_MODULES = 11;
const CODE_128_BASE_MODULES = 35;
const SYMBOL_MODULES = CHAR_MODULES * 4 + CODE_128_BASE_MODULES;
const QUIET_MODULES = 20;
const TOTAL_MODULES = SYMBOL_MODULES + QUIET_MODULES;
const MIN_MODULE_WIDTH = 2;
const MAX_MODULE_WIDTH = 8;
const TEXT_HEIGHT_DOTS = 25;
const TARGET_HEIGHT_COVERAGE = 0.9;
const MIN_BAR_HEIGHT_DOTS = 51;

function buildSingleLabel({
  code,
  moduleWidth,
  x,
  barHeight,
  y,
  widthDots,
  heightDots,
  quantity,
}: {
  code: string;
  moduleWidth: number;
  x: number;
  barHeight: number;
  y: number;
  widthDots: number;
  heightDots: number;
  quantity?: number;
}): string {
  return [
    "^XA",
    `^PW${widthDots}^LL${heightDots}`,
    "^LH0,0",
    `^BY${moduleWidth},3,${barHeight}`,
    `^FO${x},${y}^BCN,${barHeight},Y,N,N`,
    `^FD${code}^FS`,
    ...(quantity !== undefined ? [`^PQ${quantity}`] : []),
    "^XZ",
  ].join("\r\n");
}

export function buildLocationZpl({
  codes,
  quantity,
  widthDots,
  heightDots,
}: BuildLocationZplInput): string {
  const { moduleWidth, x, barHeight, y } = computeBarcodeLayout({
    widthDots,
    heightDots,
    totalModules: TOTAL_MODULES,
    symbolModules: SYMBOL_MODULES,
    minModuleWidth: MIN_MODULE_WIDTH,
    maxModuleWidth: MAX_MODULE_WIDTH,
    textHeightDots: TEXT_HEIGHT_DOTS,
    targetHeightCoverage: TARGET_HEIGHT_COVERAGE,
    minBarHeightDots: MIN_BAR_HEIGHT_DOTS,
  });

  return codes
    .map(
      (code, index) =>
        buildSingleLabel({
          code,
          moduleWidth,
          x,
          barHeight,
          y,
          widthDots,
          heightDots,
          quantity: index === 0 && codes.length === 1 ? quantity : undefined,
        })
    )
    .join("\r\n");
}