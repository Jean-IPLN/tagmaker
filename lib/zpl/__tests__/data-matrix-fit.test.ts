import { describe, expect, it } from "vitest";

import { dataMatrixFits } from "@/lib/zpl/data-matrix";

const FORMATS = [
  { name: "40x25", widthDots: 320, heightDots: 200 },
  { name: "75x25", widthDots: 600, heightDots: 200 },
  { name: "100x50", widthDots: 800, heightDots: 400 },
  { name: "100x150", widthDots: 800, heightDots: 1200 },
];

describe("dataMatrixFits — cas nominaux", () => {
  it.each(FORMATS)("$name accepte un contenu court avec légende", (format) => {
    expect(
      dataMatrixFits({
        content: "REF-2026-A17",
        legend: "Palette 42",
        widthDots: format.widthDots,
        heightDots: format.heightDots,
      })
    ).toBe(true);
  });

  it.each(FORMATS)("$name accepte un contenu court sans légende", (format) => {
    expect(
      dataMatrixFits({
        content: "12345678",
        widthDots: format.widthDots,
        heightDots: format.heightDots,
      })
    ).toBe(true);
  });

  it.each(FORMATS)(
    "$name accepte le contenu court et la légende pivotés",
    (format) => {
      expect(
        dataMatrixFits({
          content: "1A2B",
          legend: "Zone A",
          widthDots: format.widthDots,
          heightDots: format.heightDots,
          rotated: true,
        })
      ).toBe(true);
    }
  );
});

describe("dataMatrixFits — affichage in-line", () => {
  it.each([
    { widthDots: 320, heightDots: 200, content: 1, legend: 18 },
    { widthDots: 320, heightDots: 200, content: 12, legend: 17 },
    { widthDots: 320, heightDots: 200, content: 200, legend: 13 },
    { widthDots: 600, heightDots: 200, content: 1, legend: 37 },
    { widthDots: 600, heightDots: 200, content: 12, legend: 36 },
    { widthDots: 600, heightDots: 200, content: 200, legend: 31 },
    { widthDots: 800, heightDots: 400, content: 1, legend: 50 },
    { widthDots: 800, heightDots: 400, content: 12, legend: 49 },
    { widthDots: 800, heightDots: 400, content: 200, legend: 45 },
    { widthDots: 800, heightDots: 1200, content: 1, legend: 50 },
    { widthDots: 800, heightDots: 1200, content: 12, legend: 49 },
    { widthDots: 800, heightDots: 1200, content: 200, legend: 45 },
  ])(
    "accepte $legend caractères pour un contenu de $content sur $widthDots×$heightDots",
    ({ widthDots, heightDots, content, legend }) => {
      expect(
        dataMatrixFits({
          content: "A".repeat(content),
          legend: "L".repeat(legend),
          widthDots,
          heightDots,
          inline: true,
        })
      ).toBe(true);
      expect(
        dataMatrixFits({
          content: "A".repeat(content),
          legend: "L".repeat(legend + 1),
          widthDots,
          heightDots,
          inline: true,
        })
      ).toBe(false);
    }
  );

  it("ignore l'in-line lorsque l'orientation pivotée est active", () => {
    expect(
      dataMatrixFits({
        content: "A",
        legend: "L".repeat(13),
        widthDots: 320,
        heightDots: 200,
        rotated: true,
        inline: true,
      })
    ).toBe(false);
  });
});

describe("dataMatrixFits — refus", () => {
  it("refuse un module inférieur à 2 points", () => {
    expect(
      dataMatrixFits({
        content: "A".repeat(200),
        widthDots: 80,
        heightDots: 80,
      })
    ).toBe(false);
  });

  it("refuse un bloc symbole + légende plus grand que le support", () => {
    expect(
      dataMatrixFits({
        content: "A".repeat(200),
        legend: "A".repeat(60),
        widthDots: 320,
        heightDots: 200,
      })
    ).toBe(false);
  });

  it.each([
    { widthDots: 320, heightDots: 200, legend: 20, overflow: 21 },
    { widthDots: 600, heightDots: 200, legend: 38, overflow: 39 },
    { widthDots: 800, heightDots: 400, legend: 52, overflow: 53 },
    { widthDots: 800, heightDots: 1200, legend: 52, overflow: 53 },
  ])(
    "accepte la limite normale $legend caractères sur $widthDots×$heightDots",
    ({ widthDots, heightDots, legend, overflow }) => {
      expect(
        dataMatrixFits({
          content: "A",
          legend: "L".repeat(legend),
          widthDots,
          heightDots,
        })
      ).toBe(true);
      expect(
        dataMatrixFits({
          content: "A",
          legend: "L".repeat(overflow),
          widthDots,
          heightDots,
        })
      ).toBe(false);
    }
  );

  it.each([
    { widthDots: 320, heightDots: 200, legend: 12, overflow: 13 },
    { widthDots: 600, heightDots: 200, legend: 12, overflow: 13 },
    { widthDots: 800, heightDots: 400, legend: 25, overflow: 26 },
    { widthDots: 800, heightDots: 1200, legend: 60, overflow: 79 },
  ])(
    "accepte la limite pivotée $legend caractères sur $widthDots×$heightDots",
    ({ widthDots, heightDots, legend, overflow }) => {
      expect(
        dataMatrixFits({
          content: "A",
          legend: "L".repeat(legend),
          widthDots,
          heightDots,
          rotated: true,
        })
      ).toBe(true);
      expect(
        dataMatrixFits({
          content: "A",
          legend: "L".repeat(overflow),
          widthDots,
          heightDots,
          rotated: true,
        })
      ).toBe(false);
    }
  );
});
