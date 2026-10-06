import { describe, expect, it } from "vitest";

import { isEan13Valid, labelRequestSchema } from "@/lib/ean13/validate";

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

describe("labelRequestSchema — orientation optionnelle (US1)", () => {
  const base = { ean13: "5901234123457", quantity: 1 };

  it("accepte une requête sans rotated (défaut), rotated: true et rotated: false", () => {
    expect(labelRequestSchema.safeParse(base).success).toBe(true);
    expect(labelRequestSchema.safeParse({ ...base, rotated: true }).success).toBe(
      true
    );
    expect(labelRequestSchema.safeParse({ ...base, rotated: false }).success).toBe(
      true
    );
    expect(labelRequestSchema.safeParse({ ...base, rotated: undefined }).success).toBe(
      true
    );
  });

  it("rejette une valeur non booléenne pour rotated", () => {
    for (const rotated of ["true", 1, "pivoté", null]) {
      const result = labelRequestSchema.safeParse({ ...base, rotated });
      expect(result.success, String(rotated)).toBe(false);
    }
  });

  it("ignore les clés inconnues sans rejeter la requête (pas de .strict)", () => {
    const result = labelRequestSchema.safeParse({ ...base, unexpected: 1 });
    expect(result.success).toBe(true);
  });
});