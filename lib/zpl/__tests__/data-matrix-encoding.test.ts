import { describe, expect, it } from "vitest";

import {
  dataMatrixSymbolDimension,
  escapeDataMatrixData,
} from "@/lib/zpl/data-matrix";

describe("dataMatrixSymbolDimension — capacité ECC200 carrée", () => {
  it("choisit la plus petite dimension couvrant la longueur", () => {
    expect(dataMatrixSymbolDimension(1)).toBe(10);
    expect(dataMatrixSymbolDimension(3)).toBe(10);
    expect(dataMatrixSymbolDimension(4)).toBe(12);
    expect(dataMatrixSymbolDimension(12)).toBe(16);
    expect(dataMatrixSymbolDimension(13)).toBe(18);
    expect(dataMatrixSymbolDimension(50)).toBe(32);
    expect(dataMatrixSymbolDimension(120)).toBe(44);
  });

  it("gère les bornes hautes de capacité", () => {
    expect(dataMatrixSymbolDimension(174)).toBe(48);
    expect(dataMatrixSymbolDimension(175)).toBe(52);
    expect(dataMatrixSymbolDimension(200)).toBe(52);
  });
});

describe("escapeDataMatrixData — séquences ^BX", () => {
  it("échappe _, ^ et ~ sans ^FH", () => {
    expect(escapeDataMatrixData("A_B^C~D")).toBe("A__B_d094C_d126D");
  });

  it("laisse les autres caractères ASCII imprimables intacts", () => {
    const value = "AZaz09 -._#@!%&()[]{}<>|/\\";
    expect(escapeDataMatrixData(value)).toBe(
      "AZaz09 -.__#@!%&()[]{}<>|/\\"
    );
  });

  it("échappe correctement un contenu composé uniquement de séquences", () => {
    expect(escapeDataMatrixData("_^~")).toBe("___d094_d126");
  });
});
