import { describe, expect, it } from "vitest";

import { buildCode128Zpl } from "@/lib/zpl/code128";
import { buildLocationZpl } from "@/lib/zpl/location";

const FORMATS = [
  { name: "40x25", widthDots: 320, heightDots: 200 },
  { name: "75x25", widthDots: 600, heightDots: 200 },
  { name: "100x50", widthDots: 800, heightDots: 400 },
  { name: "100x150", widthDots: 800, heightDots: 1200 },
];

describe("buildCode128Zpl — encodage sous-ensemble B", () => {
  it("émet un Code 128 avec HRI désactivée et un champ texte OCR-B dédié", () => {
    const zpl = buildCode128Zpl({
      codes: ["REF-2026"],
      quantity: 1,
      widthDots: 320,
      heightDots: 200,
    });

    expect(zpl).toContain("^XA");
    expect(zpl).toContain("^XZ");
    expect(zpl).toContain("^PW320^LL200");
    expect(zpl).toContain("^FDREF-2026^FS");
    expect(zpl).toMatch(/\^BCN,\d+,N,N,N/);
    expect(zpl).toContain("^AEN,");
    expect(zpl).not.toContain("^CF");
    expect(zpl).not.toContain("^BCR");
  });

  it("conserve la casse et les espaces internes du contenu", () => {
    const zpl = buildCode128Zpl({
      codes: ["A b-12"],
      quantity: 2,
      widthDots: 320,
      heightDots: 200,
    });

    expect(zpl).toContain("^FDA b-12^FS");
    expect(zpl).toContain("^AEN,");
    expect(zpl).toContain("^PQ2");
  });

  it("calcule la largeur du symbole pour 8 caractères (11 × n + 35 + 20)", () => {
    const zpl = buildCode128Zpl({
      codes: ["12345678"],
      quantity: 1,
      widthDots: 320,
      heightDots: 200,
    });

    // totalModules = 11 × 8 + 55 = 143 → module = floor(320 / 143) = 2
    // barsWidth = (11 × 8 + 35) × 2 = 246, x = round((320 - 246) / 2) = 37
    expect(zpl).toContain("^BY2,3,");
    expect(zpl).toContain("^FO37,");
  });

  it("ne produit rien pour une liste de codes vide", () => {
    expect(
      buildCode128Zpl({ codes: [], widthDots: 320, heightDots: 200 })
    ).toBe("");
  });

  it("échappe >, ^ et ~ pour qu'ils soient encodés et imprimés", () => {
    const zpl = buildCode128Zpl({
      codes: ["BELL>>VILL^A~_"],
      quantity: 1,
      widthDots: 800,
      heightDots: 1200,
    });

    expect(zpl).toContain("^FDBELL>0>0VILL><A>=_^FS");
    expect(zpl).toContain("^FH^FDBELL>>VILL_5EA_7E_5F^FS");
  });
});

describe("buildCode128Zpl — parité avec le module Emplacement (4 caractères)", () => {
  it.each(FORMATS)("$name normal — sortie identique", ({ widthDots, heightDots }) => {
    const input = {
      codes: ["1A5B"],
      quantity: 5,
      widthDots,
      heightDots,
    };
    expect(buildCode128Zpl(input)).toBe(buildLocationZpl(input));
  });

  it.each(FORMATS)("$name pivoté — sortie identique", ({ widthDots, heightDots }) => {
    const input = {
      codes: ["1A5B"],
      quantity: 1,
      widthDots,
      heightDots,
      rotated: true,
    };
    expect(buildCode128Zpl(input)).toBe(buildLocationZpl(input));
  });

  it("un bloc par code sans ^PQ pour une liste multiple", () => {
    const zpl = buildCode128Zpl({
      codes: ["1A10", "1A11"],
      widthDots: 320,
      heightDots: 200,
    });

    expect(zpl.split("^XA").slice(1)).toHaveLength(2);
    expect(zpl).not.toContain("^PQ");
  });
});

describe("buildCode128Zpl — orientation pivotée", () => {
  it("utilise ^BCB et ^AEB pour un contenu libre", () => {
    const zpl = buildCode128Zpl({
      codes: ["ABCDEFGH"],
      quantity: 1,
      widthDots: 800,
      heightDots: 1200,
      rotated: true,
    });

    expect(zpl).toContain("^BCB,");
    expect(zpl).toContain("^AEB,");
    expect(zpl).toContain("^FDABCDEFGH^FS");
  });
});
