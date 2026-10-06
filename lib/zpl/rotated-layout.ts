import type { BarcodeLayout } from "@/lib/zpl/layout";

export const ROTATED_MARGIN_DOTS = 8;

export interface RotatedBarcodeBox {
  moduleWidth: number;
  barsWidth: number;
  barHeight: number;
  x: number;
  y: number;
}

export interface RotatedLocationBox extends RotatedBarcodeBox {
  textHeight: number;
  textWidth: number;
  gap: number;
  textX: number;
  textY: number;
}

export function computeRotatedEan13Box(
  paperWidthDots: number,
  paperHeightDots: number,
  layout: BarcodeLayout
): RotatedBarcodeBox {
  const x = Math.round((paperWidthDots - layout.barHeight) / 2);
  const y = Math.round((paperHeightDots - layout.barsWidth) / 2);
  return {
    moduleWidth: layout.moduleWidth,
    barsWidth: layout.barsWidth,
    barHeight: layout.barHeight,
    x,
    y,
  };
}

export function computeRotatedLocationBox(
  paperWidthDots: number,
  paperHeightDots: number,
  layout: BarcodeLayout,
  textHeight: number,
  gap: number,
  textWidth: number
): RotatedLocationBox {
  const maxBarHeight =
    paperWidthDots - 2 * ROTATED_MARGIN_DOTS - textHeight - gap;
  const barHeight = Math.min(layout.barHeight, maxBarHeight);
  const x = Math.round(
    (paperWidthDots - (barHeight + gap + textHeight)) / 2
  );
  const textX = x + barHeight + gap;
  const y = Math.round((paperHeightDots - layout.barsWidth) / 2);
  const textTop = Math.min(
    Math.max(Math.round((paperHeightDots - textWidth) / 2), 0),
    Math.max(paperHeightDots - textWidth, 0)
  );
  return {
    moduleWidth: layout.moduleWidth,
    barsWidth: layout.barsWidth,
    barHeight,
    x,
    y,
    textHeight,
    textWidth,
    gap,
    textX,
    textY: textTop,
  };
}