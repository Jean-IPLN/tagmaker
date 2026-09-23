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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolveModuleWidth(widthDots: number): number {
  return clamp(
    Math.floor(widthDots / TOTAL_MODULES),
    MIN_MODULE_WIDTH,
    MAX_MODULE_WIDTH
  );
}

function resolvePosition(widthDots: number, barsWidth: number): number {
  return Math.round((widthDots - barsWidth) / 2);
}

function resolveBlockHeight(heightDots: number): number {
  return Math.round(heightDots * TARGET_HEIGHT_COVERAGE);
}

function resolveBarHeight(blockHeight: number): number {
  return Math.max(blockHeight - TEXT_HEIGHT_DOTS, MIN_BAR_HEIGHT_DOTS);
}

function resolveVerticalMargin(
  heightDots: number,
  blockHeight: number
): number {
  return Math.round((heightDots - blockHeight) / 2);
}

export function buildEan13Zpl({
  ean13,
  quantity,
  widthDots,
  heightDots,
}: BuildEan13ZplInput): string {
  const dataDigits = ean13.slice(0, 12);

  const moduleWidth = resolveModuleWidth(widthDots);
  const x = resolvePosition(widthDots, DATA_MODULES * moduleWidth);
  const blockHeight = resolveBlockHeight(heightDots);
  const barHeight = resolveBarHeight(blockHeight);
  const y = resolveVerticalMargin(heightDots, blockHeight);

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