import { describe, expect, it } from "vitest";

import { buildLocationZpl } from "@/lib/zpl/location";

const FORMATS = [
  {
    name: "40x25",
    widthDots: 320,
    heightDots: 200,
    by: "^BY3,3,151",
    fo: "^FO42,10^BCN,151,N,N,N",
    textField: "^FO135,165^AEN,25,12^FD1A5B^FS",
    moduleWidth: 3,
    barsWidth: 237,
    x: 42,
    barHeight: 151,
    y: 10,
    blockHeight: 180,
    textHeight: 25,
    gap: 4,
    textWidth: 52,
    wCell: 12,
    xText: 135,
    yText: 165,
  },
  {
    name: "75x25",
    widthDots: 600,
    heightDots: 200,
    by: "^BY6,3,151",
    fo: "^FO63,10^BCN,151,N,N,N",
    textField: "^FO274,165^AEN,25,12^FD1A5B^FS",
    moduleWidth: 6,
    barsWidth: 474,
    x: 63,
    barHeight: 151,
    y: 10,
    blockHeight: 180,
    textHeight: 25,
    gap: 4,
    textWidth: 52,
    wCell: 12,
    xText: 274,
    yText: 165,
  },
  {
    name: "100x50",
    widthDots: 800,
    heightDots: 400,
    by: "^BY8,3,305",
    fo: "^FO84,20^BCN,305,N,N,N",
    textField: "^FO350,332^AEN,48,23^FD1A5B^FS",
    moduleWidth: 8,
    barsWidth: 632,
    x: 84,
    barHeight: 305,
    y: 20,
    blockHeight: 360,
    textHeight: 48,
    gap: 7,
    textWidth: 100,
    wCell: 23,
    xText: 350,
    yText: 332,
  },
  {
    name: "100x150",
    widthDots: 800,
    heightDots: 1200,
    by: "^BY8,3,988",
    fo: "^FO84,60^BCN,988,N,N,N",
    textField: "^FO316,1060^AEN,80,38^FD1A5B^FS",
    moduleWidth: 8,
    barsWidth: 632,
    x: 84,
    barHeight: 988,
    y: 60,
    blockHeight: 1080,
    textHeight: 80,
    gap: 12,
    textWidth: 168,
    wCell: 38,
    xText: 316,
    yText: 1060,
  },
];

describe("buildLocationZpl — structure du flux Code 128, référence 100x150 (single)", () => {
  it("produit une étiquette complète avec texte OCR-B dédié et quantité", () => {
    const zpl = buildLocationZpl({
      codes: ["1A5B"],
      quantity: 5,
      widthDots: 800,
      heightDots: 1200,
    });

    expect(zpl).toContain("^XA");
    expect(zpl).toContain("^XZ");
    expect(zpl).toContain("^PW800^LL1200");
    expect(zpl).toContain("^LH0,0");
    expect(zpl).toContain("^PQ5");
    expect(zpl).toContain("^BY8,3,988");
    expect(zpl).toContain("^FO84,60^BCN,988,N,N,N");
    expect(zpl).toContain("^FO316,1060^AEN,80,38^FD1A5B^FS");
  });

  it("garantit la police OCR-B via HRI désactivée + champ texte ^AEN dédié", () => {
    const zpl = buildLocationZpl({
      codes: ["1A5B"],
      quantity: 1,
      widthDots: 800,
      heightDots: 1200,
    });
    expect(zpl).toContain("^BCN,988,N,N,N");
    expect(zpl).toContain("^AEN,80,38");
    expect(zpl).not.toContain("^CF");
    expect(zpl).not.toContain("^BCN,988,Y,N,N");
  });

  it("n'utilise pas la rotation et garde le texte sous les barres", () => {
    const zpl = buildLocationZpl({
      codes: ["2#D3"],
      quantity: 1,
      widthDots: 800,
      heightDots: 1200,
    });
    expect(zpl).toContain("^BCN,988,N,N,N");
    expect(zpl).not.toContain("^BCR");
    expect(zpl).not.toContain(",N^FD");
  });
});

describe("buildLocationZpl — valeurs exactes par format", () => {
  it.each(FORMATS)(
    "$name produit le layout du contrat (module, position, hauteur, texte)",
    ({ widthDots, heightDots, by, fo, textField }) => {
      const zpl = buildLocationZpl({
        codes: ["1A5B"],
        quantity: 1,
        widthDots,
        heightDots,
      });
      expect(zpl).toContain(by);
      expect(zpl).toContain(fo);
      expect(zpl).toContain(textField);
    }
  );

  it("garde-fou : le défaut de l'application (40x25) reste scannable et lisible", () => {
    const zpl = buildLocationZpl({
      codes: ["1A5B"],
      quantity: 1,
      widthDots: 320,
      heightDots: 200,
    });
    expect(zpl).toContain("^FO42,10^BCN,151,N,N,N");
    expect(zpl).toContain("^FO135,165^AEN,25,12^FD1A5B^FS");
  });
});

describe("buildLocationZpl — invariants géométriques (data-model)", () => {
  it.each(FORMATS)(
    "$name respecte zones de silence, inclusion, centrage et alignement texte",
    ({
      widthDots,
      heightDots,
      moduleWidth,
      barsWidth,
      x,
      barHeight,
      y,
      blockHeight,
      textHeight,
      gap,
      textWidth,
      wCell,
      xText,
      yText,
    }) => {
      const zpl = buildLocationZpl({
        codes: ["1A5B"],
        quantity: 1,
        widthDots,
        heightDots,
      });

      // zones de silence ≥ 10 modules de chaque côté
      expect(x).toBeGreaterThanOrEqual(10 * moduleWidth);
      expect(widthDots - x - barsWidth).toBeGreaterThanOrEqual(
        10 * moduleWidth
      );
      // symbole inclus dans l'étiquette
      expect(x + barsWidth).toBeLessThanOrEqual(widthDots);
      // couverture verticale = 90 %
      expect(blockHeight / heightDots).toBeCloseTo(0.9, 5);
      expect(y).toBe(Math.round((heightDots - blockHeight) / 2));
      // plancher scannabilité Code 128
      expect(barHeight).toBeGreaterThanOrEqual(51);
      // le texte rentre sous le symbole et reste dans le bloc
      expect(textWidth).toBeLessThan(barsWidth);
      expect(wCell).toBeGreaterThan(0);
      expect(gap).toBeGreaterThan(0);
      expect(textHeight).toBeGreaterThanOrEqual(25);
      expect(textHeight).toBeLessThanOrEqual(80);
      expect(yText + textHeight).toBe(y + blockHeight);
      // le flux porte bien ces valeurs
      expect(zpl).toContain(`^BY${moduleWidth},3,${barHeight}`);
      expect(zpl).toContain(`^FO${x},${y}^BCN,${barHeight},N,N,N`);
      expect(
        zpl
      ).toContain(`^FO${xText},${yText}^AEN,${textHeight},${wCell}^FD1A5B^FS`);
    }
  );
});

describe("buildLocationZpl — plafond de module (clamp)", () => {
  it("plafonne le module à 8 dots pour un format très large", () => {
    const zpl = buildLocationZpl({
      codes: ["1A5B"],
      quantity: 1,
      widthDots: 10000,
      heightDots: 400,
    });
    expect(zpl).toContain("^BY8,3,");
    expect(zpl).not.toContain("^BY9,");
  });

  it("borne le module à 2 dots minimum pour un format étroit", () => {
    const zpl = buildLocationZpl({
      codes: ["1A5B"],
      quantity: 1,
      widthDots: 100,
      heightDots: 400,
    });
    expect(zpl).toContain("^BY2,3,");
  });

  it("borne la hauteur du texte OCR-B à 80 dots maximum", () => {
    const zpl = buildLocationZpl({
      codes: ["1A5B"],
      quantity: 1,
      widthDots: 800,
      heightDots: 2000,
    });
    expect(zpl).toContain("^AEN,80,");
    expect(zpl).not.toContain("^AEN,81,");
  });
});

describe("buildLocationZpl — mode plage (un bloc par code)", () => {
  it("émet un bloc ^XA…^XZ par code, sans ^PQ, champ texte par bloc", () => {
    const zpl = buildLocationZpl({
      codes: ["1A10", "1A11", "1A12"],
      widthDots: 320,
      heightDots: 200,
    });

    const blocks = zpl.split("^XA").slice(1);
    expect(blocks).toHaveLength(3);
    expect(zpl).not.toContain("^PQ");
    expect(zpl).toContain("^FD1A10^FS");
    expect(zpl).toContain("^FD1A11^FS");
    expect(zpl).toContain("^FD1A12^FS");
    expect(zpl.split("^FO42,10^BCN,151,N,N,N")).toHaveLength(4);
    expect(zpl.split("^FO135,165^AEN,25,12^FD")).toHaveLength(4);
  });

  it("utilise le même layout (module/position) sur chaque bloc de la plage", () => {
    const zpl = buildLocationZpl({
      codes: ["1A10", "1A11"],
      widthDots: 320,
      heightDots: 200,
    });
    expect(zpl.split("^FO42,10^BCN,151,N,N,N")).toHaveLength(3);
    expect(zpl.split("^BY3,3,151")).toHaveLength(3);
  });
});

describe("buildLocationZpl — saisie du code (^FD)", () => {
  it("transmet les 4 caractères du code tels quels (lettres, chiffres, #)", () => {
    const zpl = buildLocationZpl({
      codes: ["1#D7"],
      quantity: 1,
      widthDots: 320,
      heightDots: 200,
    });
    expect(zpl).toContain("^FD1#D7^FS");
  });
});