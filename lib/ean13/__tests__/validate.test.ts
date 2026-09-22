import { describe, expect, it } from "vitest";

import { isEan13Valid } from "@/lib/ean13/validate";

describe("isEan13Valid", () => {
  it("accepte un EAN-13 valide (5901234123457)", () => {
    expect(isEan13Valid("5901234123457")).toBe(true);
  });

  it("rejette un code avec une mauvaise clé (5901234123456)", () => {
    expect(isEan13Valid("5901234123456")).toBe(false);
  });

  it("rejette un code de 12 chiffres", () => {
    expect(isEan13Valid("59012341234")).toBe(false);
  });

  it("rejette des caractères non numériques", () => {
    expect(isEan13Valid("abcdefghijklm")).toBe(false);
  });

  it("rejette une chaîne vide", () => {
    expect(isEan13Valid("")).toBe(false);
  });
});