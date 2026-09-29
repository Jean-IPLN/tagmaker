import { clamp, computeBarcodeLayout } from "@/lib/zpl/layout";

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
const TARGET_HEIGHT_COVERAGE = 0.9;
const MIN_BAR_HEIGHT_DOTS = 51;
const TEXT_HEIGHT_RATIO = 0.12;
const TEXT_HEIGHT_MIN = 25;
const TEXT_HEIGHT_MAX = 80;
const TEXT_GAP_RATIO = 0.15;
const OCR_B_WIDTH_RATIO = 0.48;
const CHAR_ADVANCE_RATIO = 0.52;

function buildSingleLabel({
  code,
  moduleWidth,
  barsWidth,
  x,
  barHeight,
  y,
  textHeight,
  gap,
  widthDots,
  heightDots,
  quantity,
}: {
  code: string;
  moduleWidth: number;
  barsWidth: number;
  x: number;
  barHeight: number;
  y: number;
  textHeight: number;
  gap: number;
  widthDots: number;
  heightDots: number;
  quantity?: number;
}): string {
  const wCell = Math.round(textHeight * OCR_B_WIDTH_RATIO);
  const advance = Math.round(textHeight * CHAR_ADVANCE_RATIO);
  const textWidth = code.length * advance;
  const xText = x + Math.round((barsWidth - textWidth) / 2);
  const yText = y + barHeight + gap;

  return [
    "^XA",
    `^PW${widthDots}^LL${heightDots}`,
    "^LH0,0",
    `^BY${moduleWidth},3,${barHeight}`,
    `^FO${x},${y}^BCN,${barHeight},N,N,N`,
    `^FD${code}^FS`,
    `^FO${xText},${yText}^AEN,${textHeight},${wCell}^FD${code}^FS`,
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
  const textHeight = clamp(
    Math.round(heightDots * TEXT_HEIGHT_RATIO),
    TEXT_HEIGHT_MIN,
    TEXT_HEIGHT_MAX
  );
  const gap = Math.round(textHeight * TEXT_GAP_RATIO);

  const { moduleWidth, barsWidth, x, barHeight, y } = computeBarcodeLayout({
    widthDots,
    heightDots,
    totalModules: TOTAL_MODULES,
    symbolModules: SYMBOL_MODULES,
    minModuleWidth: MIN_MODULE_WIDTH,
    maxModuleWidth: MAX_MODULE_WIDTH,
    textHeightDots: textHeight,
    textGapDots: gap,
    targetHeightCoverage: TARGET_HEIGHT_COVERAGE,
    minBarHeightDots: MIN_BAR_HEIGHT_DOTS,
  });

  return codes
    .map(
      (code, index) =>
        buildSingleLabel({
          code,
          moduleWidth,
          barsWidth,
          x,
          barHeight,
          y,
          textHeight,
          gap,
          widthDots,
          heightDots,
          quantity: index === 0 && codes.length === 1 ? quantity : undefined,
        })
    )
    .join("\r\n");
}