import { describe, expect, it } from "vitest";

import { buildLocationZpl } from "@/lib/zpl/location";
import { SYMBOL_MODULES } from "@/lib/zpl/location";

const FORMATS = [
  {
    name: "40x25",
    widthDots: 320,
    heightDots: 200,
    by: "^BY3,3,116",
    fo: "^FO42,10^BCN,116,N,N,N",
    textField: "^FO103,134^AEN,56,27^FD1A5B^FS",
    moduleWidth: 3,
    barsWidth: 237,
    x: 42,
    barHeight: 116,
    y: 10,
    blockHeight: 180,
    textHeight: 56,
    gap: 8,
    textWidth: 116,
    wCell: 27,
    xText: 103,
    yText: 134,
  },
  {
    name: "75x25",
    widthDots: 600,
    heightDots: 200,
    by: "^BY6,3,116",
    fo: "^FO63,10^BCN,116,N,N,N",
    textField: "^FO242,134^AEN,56,27^FD1A5B^FS",
    moduleWidth: 6,
    barsWidth: 474,
    x: 63,
    barHeight: 116,
    y: 10,
    blockHeight: 180,
    textHeight: 56,
    gap: 8,
    textWidth: 116,
    wCell: 27,
    xText: 242,
    yText: 134,
  },
  {
    name: "100x50",
    widthDots: 800,
    heightDots: 400,
    by: "^BY8,3,263",
    fo: "^FO84,20^BCN,263,N,N,N",
    textField: "^FO312,296^AEN,84,40^FD1A5B^FS",
    moduleWidth: 8,
    barsWidth: 632,
    x: 84,
    barHeight: 263,
    y: 20,
    blockHeight: 360,
    textHeight: 84,
    gap: 13,
    textWidth: 176,
    wCell: 40,
    xText: 312,
    yText: 296,
  },
  {
    name: "100x150",
    widthDots: 800,
    heightDots: 1200,
    by: "^BY8,3,951",
    fo: "^FO84,60^BCN,951,N,N,N",
    textField: "^FO284,1028^AEN,112,54^FD1A5B^FS",
    moduleWidth: 8,
    barsWidth: 632,
    x: 84,
    barHeight: 951,
    y: 60,
    blockHeight: 1080,
    textHeight: 112,
    gap: 17,
    textWidth: 232,
    wCell: 54,
    xText: 284,
    yText: 1028,
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
    expect(zpl).toContain("^BY8,3,951");
    expect(zpl).toContain("^FO84,60^BCN,951,N,N,N");
    expect(zpl).toContain("^FO284,1028^AEN,112,54^FD1A5B^FS");
  });

  it("garantit la police OCR-B via HRI désactivée + champ texte ^AEN dédié", () => {
    const zpl = buildLocationZpl({
      codes: ["1A5B"],
      quantity: 1,
      widthDots: 800,
      heightDots: 1200,
    });
    expect(zpl).toContain("^BCN,951,N,N,N");
    expect(zpl).toContain("^AEN,112,54");
    expect(zpl).not.toContain("^CF");
    expect(zpl).not.toContain("^BCN,951,Y,N,N");
  });

  it("n'utilise pas la rotation et garde le texte sous les barres", () => {
    const zpl = buildLocationZpl({
      codes: ["2#D3"],
      quantity: 1,
      widthDots: 800,
      heightDots: 1200,
    });
    expect(zpl).toContain("^BCN,951,N,N,N");
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
    expect(zpl).toContain("^FO42,10^BCN,116,N,N,N");
    expect(zpl).toContain("^FO103,134^AEN,56,27^FD1A5B^FS");
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
      expect(textHeight).toBeLessThanOrEqual(112);
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

  it("borne la hauteur du texte OCR-B à 112 dots maximum (4 cellules de 28)", () => {
    const zpl = buildLocationZpl({
      codes: ["1A5B"],
      quantity: 1,
      widthDots: 800,
      heightDots: 2000,
    });
    expect(zpl).toContain("^AEN,112,");
    expect(zpl).not.toContain("^AEN,113,");
  });

  it("gère automatiquement un nouveau format de papier (50x30) — calcul générique", () => {
    const zpl = buildLocationZpl({
      codes: ["1A5B"],
      quantity: 1,
      widthDots: 400,
      heightDots: 240,
    });
    expect(zpl).toContain("^BY4,3,152");
    expect(zpl).toContain("^FO42,12^BCN,152,N,N,N");
    expect(zpl).toContain("^FO142,172^AEN,56,27^FD1A5B^FS");
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
    expect(zpl.split("^FO42,10^BCN,116,N,N,N")).toHaveLength(4);
    expect(zpl.split("^FO103,134^AEN,56,27^FD")).toHaveLength(4);
  });

  it("utilise le même layout (module/position) sur chaque bloc de la plage", () => {
    const zpl = buildLocationZpl({
      codes: ["1A10", "1A11"],
      widthDots: 320,
      heightDots: 200,
    });
    expect(zpl.split("^FO42,10^BCN,116,N,N,N")).toHaveLength(3);
    expect(zpl.split("^BY3,3,116")).toHaveLength(3);
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

describe("buildLocationZpl — orientation pivotée (^BCB/^AEB)", () => {
  it("40x25 : barres à gauche, texte OCR-B à droite, canvas inchangé", () => {
    const zpl = buildLocationZpl({
      codes: ["1A5B"],
      quantity: 1,
      widthDots: 320,
      heightDots: 200,
      rotated: true,
    });

    expect(zpl).toContain("^PW320^LL200");
    expect(zpl).toContain("^BY2,3,191");
    expect(zpl).toContain("^FO16,21^BCB,191,N,N,N");
    expect(zpl).toContain("^FO220,12^AEB,84,40^FD1A5B^FS");
    expect(zpl).not.toContain("^BCN,");
    expect(zpl).not.toContain("^AEN,");
  });

  it("100x50 : valeurs exactes du layout roté (module, positions, texte)", () => {
    const zpl = buildLocationZpl({
      codes: ["1A5B"],
      quantity: 1,
      widthDots: 800,
      heightDots: 400,
      rotated: true,
    });

    expect(zpl).toContain("^BY4,3,591");
    expect(zpl).toContain("^FO40,42^BCB,591,N,N,N");
    expect(zpl).toContain("^FO648,84^AEB,112,54^FD1A5B^FS");
  });

  it("reste sans chevauchement ni sortie sur les formats rotables", () => {
    const dims: Array<[number, number]> = [
      [320, 200],
      [600, 200],
      [800, 400],
      [800, 1200],
    ];
    for (const [widthDots, heightDots] of dims) {
      const zpl = buildLocationZpl({
        codes: ["1A5B"],
        quantity: 1,
        widthDots,
        heightDots,
        rotated: true,
      });

      const by = zpl.match(/\^BY(\d+),3,(\d+)/);
      const fo = zpl.match(/\^FO(\d+),(\d+)\^BCB,(\d+),N,N,N/);
      const text = zpl.match(/\^FO(\d+),(\d+)\^AEB,(\d+),(\d+)\^FD/);
      if (!by || !fo || !text) {
        throw new Error("Flux ZPL roté invalide.");
      }

      const moduleWidth = Number(by[1]);
      const barsWidth = moduleWidth * SYMBOL_MODULES;
      const x = Number(fo[1]);
      const barHeight = Number(fo[3]);
      const y = Number(fo[2]);
      const textX = Number(text[1]);
      const textY = Number(text[2]);
      const textHeight = Number(text[3]);
      const textWidth = 4 * Math.round(textHeight * 0.52);

      expect(barsWidth).toBeLessThanOrEqual(heightDots - 2 * 8);
      expect(x + barHeight).toBeLessThanOrEqual(widthDots - 8);
      expect(textX + textHeight).toBeLessThanOrEqual(widthDots);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y + barsWidth).toBeLessThanOrEqual(heightDots);
      expect(textY).toBeGreaterThanOrEqual(0);
      expect(textY + textWidth).toBeLessThanOrEqual(heightDots);
    }
  });

  it("un bloc par code en mode plage, chaque bloc en orientation B", () => {
    const zpl = buildLocationZpl({
      codes: ["1A10", "1A11"],
      widthDots: 320,
      heightDots: 200,
      rotated: true,
    });

    const blocks = zpl.split("^XA").slice(1);
    expect(blocks).toHaveLength(2);
    expect(zpl).not.toContain("^PQ");
    expect(zpl.split("^FO16,21^BCB,191,N,N,N")).toHaveLength(3);
    expect(zpl.split("^FO220,12^AEB,84,40^FD")).toHaveLength(3);
  });

  it("rotated: false (par défaut) garde exactement le comportement actuel", () => {
    const plain = buildLocationZpl({
      codes: ["1A5B"],
      quantity: 1,
      widthDots: 320,
      heightDots: 200,
    });
    expect(
      buildLocationZpl({
        codes: ["1A5B"],
        quantity: 1,
        widthDots: 320,
        heightDots: 200,
        rotated: false,
      })
    ).toBe(plain);
  });
});