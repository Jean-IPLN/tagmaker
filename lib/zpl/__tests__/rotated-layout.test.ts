import { describe, expect, it } from "vitest";

import {
  computeRotatedEan13Box,
  computeRotatedLocationBox,
  ROTATED_MARGIN_DOTS,
} from "@/lib/zpl/rotated-layout";
import { computeBarcodeLayout } from "@/lib/zpl/layout";

describe("computeRotatedEan13Box", () => {
  it("place les barres verticalement sur l'axe long (x), ancrées haut", () => {
    const layout = computeBarcodeLayout({
      widthDots: 200,
      heightDots: 320,
      totalModules: 113,
      symbolModules: 95,
      minModuleWidth: 2,
      maxModuleWidth: 5,
      textHeightDots: 25,
      targetHeightCoverage: 0.9,
      minBarHeightDots: 146,
    });

    const box = computeRotatedEan13Box(320, 200, layout);

    expect(box).toEqual({
      moduleWidth: 2,
      barsWidth: 190,
      barHeight: 263,
      x: 29,
      y: 5,
    });
    expect(box.barsWidth).toBe(layout.barsWidth);
    expect(box.barHeight).toBe(layout.barHeight);
  });

  it("reste dans l'étiquette pour des formats variés (200 – 800 dots)", () => {
    const dims: Array<[number, number]> = [
      [320, 200],
      [600, 200],
      [800, 400],
      [800, 1200],
    ];
    for (const [widthDots, heightDots] of dims) {
      const layout = computeBarcodeLayout({
        widthDots: heightDots,
        heightDots: widthDots,
        totalModules: 113,
        symbolModules: 95,
        minModuleWidth: 2,
        maxModuleWidth: 5,
        textHeightDots: 25,
        targetHeightCoverage: 0.9,
        minBarHeightDots: 146,
      });
      const box = computeRotatedEan13Box(widthDots, heightDots, layout);

      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.barHeight).toBeLessThanOrEqual(widthDots);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.barsWidth).toBeLessThanOrEqual(heightDots);
    }
  });
});

describe("computeRotatedLocationBox", () => {
  it("place les barres à gauche et le texte OCR-B à droite, ancrage haut", () => {
    const layout = computeBarcodeLayout({
      widthDots: 200,
      heightDots: 320,
      totalModules: 99,
      symbolModules: 79,
      minModuleWidth: 2,
      maxModuleWidth: 8,
      textHeightDots: 84,
      textGapDots: 13,
      targetHeightCoverage: 0.9,
      minBarHeightDots: 51,
    });

    const box = computeRotatedLocationBox(320, 200, layout, 84, 13, 176);

    expect(box).toMatchObject({
      barHeight: 191,
      x: 16,
      textX: 220,
      y: 21,
      textY: 12,
    });
    expect(box.textX - box.x - box.barHeight).toBe(13);
  });

  it("plafonne la hauteur des barres pour garantir la marge et le texte", () => {
    const layout = computeBarcodeLayout({
      widthDots: 200,
      heightDots: 320,
      totalModules: 99,
      symbolModules: 79,
      minModuleWidth: 2,
      maxModuleWidth: 8,
      textHeightDots: 84,
      textGapDots: 13,
      targetHeightCoverage: 0.9,
      minBarHeightDots: 51,
    });
    const hugeText = 200;
    const gap = 20;

    const box = computeRotatedLocationBox(320, 200, layout, hugeText, gap, 120);

    expect(box.barHeight).toBe(
      Math.min(layout.barHeight, 320 - 2 * ROTATED_MARGIN_DOTS - hugeText - gap)
    );
    expect(box.x).toBeGreaterThanOrEqual(ROTATED_MARGIN_DOTS);
  });

  it("conserve un écart de marge minimal sur chaque axe (200 – 800 dots)", () => {
    const dims: Array<[number, number]> = [
      [320, 200],
      [600, 200],
      [800, 400],
    ];
    for (const [widthDots, heightDots] of dims) {
      const layout = computeBarcodeLayout({
        widthDots: heightDots,
        heightDots: widthDots,
        totalModules: 99,
        symbolModules: 79,
        minModuleWidth: 2,
        maxModuleWidth: 8,
        textHeightDots: 84,
        textGapDots: 13,
        targetHeightCoverage: 0.9,
        minBarHeightDots: 51,
      });
      const textHeight = Math.min(84, widthDots - 2 * ROTATED_MARGIN_DOTS - 30);
      const box = computeRotatedLocationBox(
        widthDots,
        heightDots,
        layout,
        textHeight,
        13,
        116
      );

      expect(box.x).toBeGreaterThanOrEqual(ROTATED_MARGIN_DOTS);
      expect(box.x + box.barHeight + 13 + box.textHeight).toBeLessThanOrEqual(
        widthDots
      );
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.barsWidth).toBeLessThanOrEqual(heightDots);
      expect(box.textY).toBeGreaterThanOrEqual(0);
      expect(box.textY + box.textWidth).toBeLessThanOrEqual(heightDots);
    }
  });
});