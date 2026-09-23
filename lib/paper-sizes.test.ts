import { describe, expect, it } from "vitest";
import {
  parsePaperSizes,
  sizeById,
} from "@/lib/paper-sizes";

const FALLBACK = { widthMm: 40, heightMm: 25 };

describe("parsePaperSizes", () => {
  it("parse les formats au format humain et les trie par surface croissante", () => {
    const sizes = parsePaperSizes("40x25, 50x25, 60x40, 100x50", FALLBACK);

    expect(sizes.map((s) => s.id)).toEqual(["40x25", "50x25", "60x40", "100x50"]);
    expect(sizes.map((s) => s.surfaceMm2)).toEqual([1000, 1250, 2400, 5000]);
    expect(sizes[0].label).toBe("40 × 25 mm");
    expect(sizes[0]).toEqual({
      id: "40x25",
      widthMm: 40,
      heightMm: 25,
      surfaceMm2: 1000,
      label: "40 × 25 mm",
    });
  });

  it("écarte silencieusement les formats illisibles et invalides", () => {
    const sizes = parsePaperSizes("zpl, abc, -3x0, 40x25, 0x25, 50x25", FALLBACK);

    expect(sizes.map((s) => s.id)).toEqual(["40x25", "50x25"]);
  });

  it("supprime les doublons d'identifiant", () => {
    const sizes = parsePaperSizes("40x25, 40x25, 60x40, 40x25", FALLBACK);

    expect(sizes.map((s) => s.id)).toEqual(["40x25", "60x40"]);
  });

  it("accepte le point-virgule et la majuscule comme séparateurs", () => {
    const sizes = parsePaperSizes("40x25; 50X25; 60x40", FALLBACK);

    expect(sizes.map((s) => s.id)).toEqual(["40x25", "50x25", "60x40"]);
  });

  it("replie sur l'unique format courant quand la variable est absente ou vide", () => {
    expect(parsePaperSizes(undefined, FALLBACK).map((s) => s.id)).toEqual(["40x25"]);
    expect(parsePaperSizes("", FALLBACK).map((s) => s.id)).toEqual(["40x25"]);
  });

  it("replie sur le format courant quand aucun format n'est valide", () => {
    expect(parsePaperSizes("zpl, abc", FALLBACK).map((s) => s.id)).toEqual(["40x25"]);
  });
});

describe("sizeById", () => {
  const sizes = parsePaperSizes("40x25, 50x25, 60x40", FALLBACK);

  it("retourne le format associé à un identifiant connu", () => {
    expect(sizeById("60x40", sizes)?.widthMm).toBe(60);
    expect(sizeById("40x25", sizes)?.surfaceMm2).toBe(1000);
  });

  it("retourne undefined pour un identifiant inconnu", () => {
    expect(sizeById("999x999", sizes)).toBeUndefined();
  });
});