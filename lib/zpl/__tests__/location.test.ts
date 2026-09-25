import { describe, expect, it } from "vitest";

import { buildLocationZpl } from "@/lib/zpl/location";

const FORMATS = [
  {
    name: "40x25",
    widthDots: 320,
    heightDots: 200,
    by: "^BY3,3,155",
    fo: "^FO42,10^BCN,155,Y,N,N",
    moduleWidth: 3,
    barsWidth: 237,
    x: 42,
    barHeight: 155,
    y: 10,
    blockHeight: 180,
  },
  {
    name: "75x25",
    widthDots: 600,
    heightDots: 200,
    by: "^BY6,3,155",
    fo: "^FO63,10^BCN,155,Y,N,N",
    moduleWidth: 6,
    barsWidth: 474,
    x: 63,
    barHeight: 155,
    y: 10,
    blockHeight: 180,
  },
  {
    name: "100x50",
    widthDots: 800,
    heightDots: 400,
    by: "^BY8,3,335",
    fo: "^FO84,20^BCN,335,Y,N,N",
    moduleWidth: 8,
    barsWidth: 632,
    x: 84,
    barHeight: 335,
    y: 20,
    blockHeight: 360,
  },
  {
    name: "100x150",
    widthDots: 800,
    heightDots: 1200,
    by: "^BY8,3,1055",
    fo: "^FO84,60^BCN,1055,Y,N,N",
    moduleWidth: 8,
    barsWidth: 632,
    x: 84,
    barHeight: 1055,
    y: 60,
    blockHeight: 1080,
  },
];

describe("buildLocationZpl — structure du flux Code 128 (single)", () => {
  it("produit une étiquette complète avec ligne lisible et quantité", () => {
    const zpl = buildLocationZpl({
      codes: ["1A5B"],
      quantity: 5,
      widthDots: 320,
      heightDots: 200,
    });

    expect(zpl).toContain("^XA");
    expect(zpl).toContain("^XZ");
    expect(zpl).toContain("^PW320^LL200");
    expect(zpl).toContain("^LH0,0");
    expect(zpl).toContain("^FD1A5B^FS");
    expect(zpl).toContain("^PQ5");
    expect(zpl).toContain("^BCN,155,Y,N,N");
    expect(zpl).toContain("^BY3,3,155");
    expect(zpl).toContain("^FO42,10");
  });

  it("n'utilise pas la rotation et garde la ligne lisible sous les barres", () => {
    const zpl = buildLocationZpl({
      codes: ["2#D3"],
      quantity: 1,
      widthDots: 320,
      heightDots: 200,
    });
    expect(zpl).toContain("^BCN,155,Y,N,N");
    expect(zpl).not.toContain("^BCR");
    expect(zpl).not.toContain(",N^FD");
  });
});

describe("buildLocationZpl — valeurs exactes par format", () => {
  it.each(FORMATS)(
    "$name produit le layout du contrat (module, position, hauteur)",
    ({ widthDots, heightDots, by, fo }) => {
      const zpl = buildLocationZpl({
        codes: ["1A5B"],
        quantity: 1,
        widthDots,
        heightDots,
      });
      expect(zpl).toContain(by);
      expect(zpl).toContain(fo);
    }
  );
});

describe("buildLocationZpl — invariants géométriques (data-model)", () => {
  it.each(FORMATS)(
    "$name respecte zones de silence, inclusion et centrage",
    ({
      widthDots,
      heightDots,
      moduleWidth,
      barsWidth,
      x,
      barHeight,
      y,
      blockHeight,
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
      // le flux porte bien ces valeurs
      expect(zpl).toContain(`^BY${moduleWidth},3,${barHeight}`);
      expect(zpl).toContain(`^FO${x},${y}^BCN,${barHeight},Y,N,N`);
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
});

describe("buildLocationZpl — mode plage (un bloc par code)", () => {
  it("émet un bloc ^XA…^XZ par code, sans ^PQ", () => {
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
  });

  it("utilise le même layout (module/position) sur chaque bloc de la plage", () => {
    const zpl = buildLocationZpl({
      codes: ["1A10", "1A11"],
      widthDots: 320,
      heightDots: 200,
    });
    expect(zpl.split("^FO42,10^BCN,155,Y,N,N")).toHaveLength(3);
    expect(zpl.split("^BY3,3,155")).toHaveLength(3);
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