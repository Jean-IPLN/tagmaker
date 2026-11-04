import { describe, expect, it } from "vitest";

import {
  buildCode128Zpl,
  code128Fits,
  maxCode128Length,
} from "@/lib/zpl/code128";

const FORMATS = [
  { name: "40x25", widthDots: 320, heightDots: 200, normal: 9, rotated: 4 },
  { name: "75x25", widthDots: 600, heightDots: 200, normal: 22, rotated: 4 },
  { name: "100x50", widthDots: 800, heightDots: 400, normal: 31, rotated: 13 },
  { name: "100x150", widthDots: 800, heightDots: 1200, normal: 31, rotated: 49 },
];

describe("maxCode128Length — limites par format (module min 2 points)", () => {
  it.each(FORMATS)("$name normal → $normal caractères", (format) => {
    expect(
      maxCode128Length({
        widthDots: format.widthDots,
        heightDots: format.heightDots,
      })
    ).toBe(format.normal);
  });

  it.each(FORMATS)("$name pivoté → $rotated caractères", (format) => {
    expect(
      maxCode128Length({
        widthDots: format.widthDots,
        heightDots: format.heightDots,
        rotated: true,
      })
    ).toBe(format.rotated);
  });

  it("plafonne à 80 caractères au maximum", () => {
    expect(
      maxCode128Length({ widthDots: 100000, heightDots: 100000 })
    ).toBe(80);
  });

  it("ne renvoie jamais une limite négative", () => {
    expect(maxCode128Length({ widthDots: 50, heightDots: 50 })).toBe(0);
  });
});

describe("code128Fits", () => {
  it.each(FORMATS)("$name normal : accepte la limite, refuse +1", (format) => {
    const dimensions = {
      widthDots: format.widthDots,
      heightDots: format.heightDots,
    };
    expect(code128Fits("A".repeat(format.normal), dimensions)).toBe(true);
    expect(code128Fits("A".repeat(format.normal + 1), dimensions)).toBe(false);
  });

  it.each(FORMATS)("$name pivoté : accepte la limite, refuse +1", (format) => {
    const dimensions = {
      widthDots: format.widthDots,
      heightDots: format.heightDots,
      rotated: true,
    };
    expect(code128Fits("A".repeat(format.rotated), dimensions)).toBe(true);
    expect(code128Fits("A".repeat(format.rotated + 1), dimensions)).toBe(
      false
    );
  });

  it("à la limite du format, le code-barres tient avec une largeur de module de 2", () => {
    const zpl = buildCode128Zpl({
      codes: ["A".repeat(9)],
      quantity: 1,
      widthDots: 320,
      heightDots: 200,
    });

    expect(zpl).toContain("^BY2,3,");
  });
});
