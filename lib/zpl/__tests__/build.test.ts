import { describe, expect, it } from "vitest";

import { buildEan13Zpl } from "@/lib/zpl/build";

const ean13 = "5901234123457";
const dataDigits = "590123412345";
const quantity = 5;

type Layout = {
  name: string;
  widthDots: number;
  heightDots: number;
  moduleWidth: number;
  x: number;
  y: number;
  barHeight: number;
};

const textHeightDots = 25;
const dataModules = 95;
const quietLeftModules = 11;
const quietRightModules = 7;
const minBarHeight = 146;

const layouts: Layout[] = [
  {
    name: "40x25",
    widthDots: 320,
    heightDots: 200,
    moduleWidth: 2,
    x: 65,
    y: 10,
    barHeight: 155,
  },
  {
    name: "75x25",
    widthDots: 600,
    heightDots: 200,
    moduleWidth: 5,
    x: 63,
    y: 10,
    barHeight: 155,
  },
  {
    name: "100x50",
    widthDots: 800,
    heightDots: 400,
    moduleWidth: 5,
    x: 163,
    y: 20,
    barHeight: 335,
  },
  {
    name: "100x150",
    widthDots: 800,
    heightDots: 1200,
    moduleWidth: 5,
    x: 163,
    y: 60,
    barHeight: 1055,
  },
];

function parseLayout(zpl: string): {
  moduleWidth: number;
  barHeight: number;
  x: number;
  y: number;
  widthDots: number;
  heightDots: number;
} {
  const by = zpl.match(/\^BY(\d+),3,(\d+)/);
  const fo = zpl.match(/\^FO(\d+),(\d+)\^BEN,(\d+),Y,N/);
  const pw = zpl.match(/\^PW(\d+)/);
  const ll = zpl.match(/\^LL(\d+)/);
  if (!by || !fo || !pw || !ll) {
    throw new Error("Flux ZPL invalide : layout introuvable.");
  }
  return {
    moduleWidth: Number(by[1]),
    barHeight: Number(by[2]),
    x: Number(fo[1]),
    y: Number(fo[2]),
    widthDots: Number(pw[1]),
    heightDots: Number(ll[1]),
  };
}

describe("buildEan13Zpl", () => {
  const zpl = buildEan13Zpl({
    ean13,
    quantity,
    widthDots: 320,
    heightDots: 200,
  });

  it("délimite le flux par ^XA et ^XZ", () => {
    expect(zpl).toContain("^XA");
    expect(zpl).toContain("^XZ");
    expect(zpl.indexOf("^XA")).toBeLessThan(zpl.indexOf("^XZ"));
  });

  it("utilise les dimensions de l'étiquette (^PW320^LL200)", () => {
    expect(zpl).toContain("^PW320^LL200");
  });

  it("envoie les 12 chiffres de données sans la clé (^FD590123412345)", () => {
    expect(zpl).toContain(`^FD${dataDigits}^FS`);
    expect(zpl).not.toContain(`^FD${ean13}^FS`);
  });

  it("fixe le nombre de copies à la quantité (^PQ5)", () => {
    expect(zpl).toContain(`^PQ${quantity}`);
  });
});

describe("buildEan13Zpl — layout centré et pleine échelle par format", () => {
  it.each(layouts)(
    "$name : émet ^BY$moduleWidth,3,$barHeight (module X et hauteur calculés)",
    ({ widthDots, heightDots, moduleWidth, barHeight }) => {
      const zpl = buildEan13Zpl({ ean13, quantity, widthDots, heightDots });
      expect(zpl).toContain(`^BY${moduleWidth},3,${barHeight}`);
    }
  );

  it.each(layouts)(
    "$name : positionne ^FO$x,$y avec des barres de $barHeight dots",
    ({ widthDots, heightDots, x, y, barHeight }) => {
      const zpl = buildEan13Zpl({ ean13, quantity, widthDots, heightDots });
      expect(zpl).toContain(`^FO${x},${y}^BEN,${barHeight},Y,N`);
    }
  );
});

describe("buildEan13Zpl — invariants géométriques (parse du flux)", () => {
  it.each(layouts)(
    "$name : préserve les zones de silence (marge ≥ 11 modules gauche, ≥ 7 droite)",
    ({ widthDots, heightDots }) => {
      const zpl = buildEan13Zpl({ ean13, quantity, widthDots, heightDots });
      const { moduleWidth, x } = parseLayout(zpl);
      expect(x).toBeGreaterThanOrEqual(quietLeftModules * moduleWidth);
      expect(x).toBeGreaterThanOrEqual(quietRightModules * moduleWidth);
    }
  );

  it.each(layouts)(
    "$name : reste dans la largeur de l'étiquette (x + barres ≤ largeur)",
    ({ widthDots, heightDots }) => {
      const zpl = buildEan13Zpl({ ean13, quantity, widthDots, heightDots });
      const { moduleWidth, x } = parseLayout(zpl);
      expect(x + dataModules * moduleWidth).toBeLessThanOrEqual(widthDots);
    }
  );

  it.each(layouts)(
    "$name : bloc centré verticalement (marge haute = marge basse)",
    ({ widthDots, heightDots }) => {
      const zpl = buildEan13Zpl({ ean13, quantity, widthDots, heightDots });
      const { barHeight, y, heightDots: h } = parseLayout(zpl);
      const bottomMargin = h - (y + barHeight + textHeightDots);
      expect(bottomMargin).toBe(y);
    }
  );

  it.each(layouts)(
    "$name : bloc (barres + chiffres) couvre exactement 90 % de la hauteur utile",
    ({ widthDots, heightDots }) => {
      const zpl = buildEan13Zpl({ ean13, quantity, widthDots, heightDots });
      const { barHeight, heightDots: h } = parseLayout(zpl);
      expect((barHeight + textHeightDots) / h).toBeCloseTo(0.9, 10);
    }
  );

  it.each(layouts)(
    "$name : hauteur de barres ≥ plancher GS1 (146 dots)",
    ({ widthDots, heightDots }) => {
      const zpl = buildEan13Zpl({ ean13, quantity, widthDots, heightDots });
      const { barHeight } = parseLayout(zpl);
      expect(barHeight).toBeGreaterThanOrEqual(minBarHeight);
    }
  );

  it("plafonne le module X à 5 dots (X max GS1) même sur une étiquette très large", () => {
    const zpl = buildEan13Zpl({ ean13, quantity, widthDots: 10000, heightDots: 200 });
    const { moduleWidth } = parseLayout(zpl);
    expect(moduleWidth).toBe(5);
  });

  it("ne descend jamais sous 2 dots (X min on-demand) sur une étiquette étroite", () => {
    const zpl = buildEan13Zpl({ ean13, quantity, widthDots: 200, heightDots: 200 });
    const { moduleWidth, x } = parseLayout(zpl);
    expect(moduleWidth).toBe(2);
    expect(x).toBeGreaterThanOrEqual(0);
  });

  it("plancher : garde une hauteur de barres ≥ 146 dots même sur une étiquette courte", () => {
    const zpl = buildEan13Zpl({ ean13, quantity, widthDots: 320, heightDots: 120 });
    const { barHeight } = parseLayout(zpl);
    expect(barHeight).toBeGreaterThanOrEqual(minBarHeight);
  });
});