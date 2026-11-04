import { describe, expect, it } from "vitest";

import { buildDataMatrixZpl } from "@/lib/zpl/data-matrix";

describe("buildDataMatrixZpl — orientation normale", () => {
  it("produit un Data Matrix carré avec la légende OCR-B sous le code", () => {
    const zpl = buildDataMatrixZpl({
      content: "REF-2026-A17",
      legend: "Palette 42",
      quantity: 1,
      widthDots: 320,
      heightDots: 200,
    });

    expect(zpl).toContain("^XA");
    expect(zpl).toContain("^XZ");
    expect(zpl).toContain("^PW320^LL200");
    expect(zpl).toContain("^LH0,0");
    expect(zpl).toContain("^FO112,20^BXN,6,200,16,16,6,_,1");
    expect(zpl).toContain("^FDREF-2026-A17^FS");
    expect(zpl).toContain(
      "^FO0,124^AEN,56,27^FB320,1,0,C^FDPalette 42^FS"
    );
    expect(zpl).toContain("^PQ1");
    expect(zpl).not.toContain("^BY");
    expect(zpl).not.toContain("^FH");
  });

  it("n'émet aucun champ texte sans légende", () => {
    const zpl = buildDataMatrixZpl({
      content: "12345678",
      widthDots: 320,
      heightDots: 200,
    });

    expect(zpl).toContain("^FO104,44^BXN,8,200,14,14,6,_,1");
    expect(zpl).not.toContain("^AEN");
    expect(zpl).not.toContain("^FB");
    expect(zpl).not.toContain("^PQ");
  });

  it("force la dimension 0 au-delà de 48 modules", () => {
    const zpl = buildDataMatrixZpl({
      content: "A".repeat(200),
      widthDots: 800,
      heightDots: 1200,
    });

    expect(zpl).toContain("^BXN,8,200,0,0,6,_,1");
  });
});

describe("buildDataMatrixZpl — orientation pivotée", () => {
  it("utilise ^BXB et place la légende à droite du symbole", () => {
    const zpl = buildDataMatrixZpl({
      content: "1A2B",
      legend: "Zone A",
      widthDots: 320,
      heightDots: 200,
      rotated: true,
    });

    expect(zpl).toContain("^FO80,52^BXB,8,200,12,12,6,_,1");
    expect(zpl).toContain(
      "^FO184,0^AEB,56,27^FB200,1,0,C^FDZone A^FS"
    );
    expect(zpl).not.toContain("^BXN");
  });

  it("centre le symbole seul sur les deux axes", () => {
    const zpl = buildDataMatrixZpl({
      content: "1A2B",
      widthDots: 320,
      heightDots: 200,
      rotated: true,
    });

    expect(zpl).toContain("^FO112,52^BXB,8,200,12,12,6,_,1");
    expect(zpl).not.toContain("^AEB");
  });
});

describe("buildDataMatrixZpl — échappements", () => {
  it("échappe le contenu Data Matrix et la légende séparément", () => {
    const zpl = buildDataMatrixZpl({
      content: "A_B^C~D",
      legend: "Lot_5^A~B",
      widthDots: 800,
      heightDots: 1200,
    });

    expect(zpl).toContain("^FDA__B_d094C_d126D^FS");
    expect(zpl).toContain("^FH^FDLot_5F5_5EA_7EB^FS");
  });

  it("n'utilise ^FH que pour la légende qui en a besoin", () => {
    const zpl = buildDataMatrixZpl({
      content: "A_B^C~D",
      widthDots: 800,
      heightDots: 1200,
    });

    expect(zpl).toContain("^FDA__B_d094C_d126D^FS");
    expect(zpl).not.toContain("^FH");
  });
});
