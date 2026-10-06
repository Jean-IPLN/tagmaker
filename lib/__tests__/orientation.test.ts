import { describe, expect, it } from "vitest";

import {
  isRotatable,
  rotationShortSideThresholdMm,
  rotationThresholdModules,
} from "@/lib/orientation";

describe("thresholds de faisabilité (US3)", () => {
  it("dérive les seuils des constantes ZPL (EAN-13 190 dots > Code 128 158 dots)", () => {
    expect(rotationThresholdModules()).toBe(190);
  });

  it("convertit le seuil en millimètres pour la résolution d'impression", () => {
    expect(rotationShortSideThresholdMm(203)).toBeCloseTo(
      (190 * 25.4) / 203,
      5
    );
    expect(rotationShortSideThresholdMm(203)).toBeLessThan(25);
  });

  it("déclare rotatable tout format dont le côté court suffit (25 mm @ 203 dpi)", () => {
    expect(isRotatable({ widthMm: 40, heightMm: 25 }, 203)).toBe(true);
    expect(isRotatable({ widthMm: 25, heightMm: 100 }, 203)).toBe(true);
    expect(isRotatable({ widthMm: 100, heightMm: 150 }, 203)).toBe(true);
  });

  it("refuse un format dont le côté court est insuffisant (20 mm @ 203 dpi)", () => {
    expect(isRotatable({ widthMm: 20, heightMm: 20 }, 203)).toBe(false);
    expect(isRotatable({ widthMm: 60, heightMm: 20 }, 203)).toBe(false);
  });

  it("tient compte de la résolution (seuil plus permissif en haute résolution)", () => {
    const highDpi = rotationShortSideThresholdMm(300);
    expect(highDpi).toBeLessThan(rotationShortSideThresholdMm(203));
    expect(isRotatable({ widthMm: 20, heightMm: 20 }, 300)).toBe(true);
  });

  it("utilise le côté court du format, quel que soit l'ordre des axes", () => {
    expect(isRotatable({ widthMm: 25, heightMm: 40 }, 203)).toBe(true);
    expect(isRotatable({ widthMm: 40, heightMm: 25 }, 203)).toBe(true);
  });
});