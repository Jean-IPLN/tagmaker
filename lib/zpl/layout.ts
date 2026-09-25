export interface BarcodeLayout {
  moduleWidth: number;
  barsWidth: number;
  x: number;
  blockHeight: number;
  barHeight: number;
  y: number;
}

export interface BarcodeLayoutConfig {
  widthDots: number;
  heightDots: number;
  totalModules: number;
  symbolModules: number;
  minModuleWidth: number;
  maxModuleWidth: number;
  textHeightDots: number;
  targetHeightCoverage: number;
  minBarHeightDots: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeBarcodeLayout(
  config: BarcodeLayoutConfig
): BarcodeLayout {
  const moduleWidth = clamp(
    Math.floor(config.widthDots / config.totalModules),
    config.minModuleWidth,
    config.maxModuleWidth
  );
  const barsWidth = config.symbolModules * moduleWidth;
  const x = Math.round((config.widthDots - barsWidth) / 2);
  const blockHeight = Math.round(
    config.heightDots * config.targetHeightCoverage
  );
  const barHeight = Math.max(
    blockHeight - config.textHeightDots,
    config.minBarHeightDots
  );
  const y = Math.round((config.heightDots - blockHeight) / 2);

  return { moduleWidth, barsWidth, x, blockHeight, barHeight, y };
}