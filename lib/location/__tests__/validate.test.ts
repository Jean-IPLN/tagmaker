import { describe, expect, it } from "vitest";

import { locationRequestSchema } from "@/lib/location/validate";
import {
  expandRange,
  expandRanges,
  isLocationCodeOfType,
  isLocationCodeValid,
} from "@/lib/location/validate";
import { rangeSize, totalRangeSizeIssue } from "@/lib/location/validate";
import {
  MAX_RANGE_SIZE,
  MAX_RANGES,
  MAX_TOTAL_LABELS,
} from "@/lib/location/code";

describe("isLocationCodeValid — nomenclature (FR-005)", () => {
  it("accepte les codes valides (exactement 4 caractères)", () => {
    const valid: string[] = ["1A5B", "2B9C", "1#D7", "1A90", "2#DZ", "1A1A"];
    for (const code of valid) {
      expect(isLocationCodeValid(code), code).toBe(true);
    }
  });

  it("rejette les codes hors nomenclature", () => {
    const invalid: string[] = [
      "",
      "X1",
      "1a5b",
      "0A12",
      "3B25",
      "1A05",
      "1A 5",
      "1+5B",
      "ABC",
      "1A5B6",
      "1#D",
      "1A00",
    ];
    for (const code of invalid) {
      expect(isLocationCodeValid(code), code).toBe(false);
    }
  });
});

describe("isLocationCodeOfType — cohérence type × code (FR-006)", () => {
  it("Classique : groupe lettre + 1-9/A-Z", () => {
    expect(isLocationCodeOfType("1A5B", "classic")).toBe(true);
    expect(isLocationCodeOfType("2B9C", "classic")).toBe(true);
    expect(isLocationCodeOfType("1#D7", "classic")).toBe(false);
  });

  it("Dynamique : littéral #D", () => {
    expect(isLocationCodeOfType("1#D7", "dynamic")).toBe(true);
    expect(isLocationCodeOfType("2#DZ", "dynamic")).toBe(true);
    expect(isLocationCodeOfType("1A5B", "dynamic")).toBe(false);
  });
});

describe("locationRequestSchema — mode single", () => {
  it("accepte un code classique valide", () => {
    const result = locationRequestSchema.safeParse({
      mode: "single",
      locationType: "classic",
      code: "1A5B",
      quantity: 5,
    });
    expect(result.success).toBe(true);
  });

  it("accepte un code dynamique valide", () => {
    const result = locationRequestSchema.safeParse({
      mode: "single",
      locationType: "dynamic",
      code: "1#D7",
      quantity: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejette un code #D en mode Classique avec un message orientant", () => {
    const result = locationRequestSchema.safeParse({
      mode: "single",
      locationType: "classic",
      code: "1#D5",
      quantity: 3,
    });
    expect(result.success).toBe(false);
    const message = result.error?.issues[0]?.message ?? "";
    expect(message).toMatch(/Dynamique/i);
  });

  it("rejette un code lettre-groupe en mode Dynamique avec un message orientant", () => {
    const result = locationRequestSchema.safeParse({
      mode: "single",
      locationType: "dynamic",
      code: "1A5B",
      quantity: 3,
    });
    expect(result.success).toBe(false);
    const message = result.error?.issues[0]?.message ?? "";
    expect(message).toMatch(/Classique/i);
  });

  it("rejette une quantité hors 1..1000", () => {
    const zero = locationRequestSchema.safeParse({
      mode: "single",
      locationType: "classic",
      code: "1A5B",
      quantity: 0,
    });
    expect(zero.success).toBe(false);
    const thousandAndOne = locationRequestSchema.safeParse({
      mode: "single",
      locationType: "classic",
      code: "1A5B",
      quantity: 1001,
    });
    expect(thousandAndOne.success).toBe(false);
  });

  it("rejette un code hors format (0 en 2e position du groupe lettre)", () => {
    const result = locationRequestSchema.safeParse({
      mode: "single",
      locationType: "classic",
      code: "1A05",
      quantity: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("locationRequestSchema — mode range (plages multiples)", () => {
  it("accepte un ensemble d'une plage classique valide (1A10 → 1A1B)", () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges: [{ startCode: "1A10", endCode: "1A1B" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepte un ensemble de deux plages valides (somme des tailles)", () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges: [
        { startCode: "1A10", endCode: "1A12" },
        { startCode: "1B10", endCode: "1B14" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepte des plages de zones différentes (lots indépendants, 1E et 2E)", () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges: [
        { startCode: "1A10", endCode: "1A12" },
        { startCode: "2B10", endCode: "2B14" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepte un ensemble de plages dynamiques (2#D0 → 2#D9)", () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "dynamic",
      ranges: [{ startCode: "2#D0", endCode: "2#D9" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejette une plage traversant les zones (1A10 → 2A10)", () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges: [{ startCode: "1A10", endCode: "2A10" }],
    });
    expect(result.success).toBe(false);
    const message = result.error?.issues[0]?.message ?? "";
    expect(message).toMatch(/zone/i);
    expect(message).toMatch(/Plage 1/);
  });

  it(`rejette une plage générant plus de ${MAX_RANGE_SIZE} étiquettes (1A10 → 1AZZ)`, () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges: [{ startCode: "1A10", endCode: "1AZZ" }],
    });
    expect(result.success).toBe(false);
    const message = result.error?.issues[0]?.message ?? "";
    expect(message).toMatch(/1000/i);
    expect(message).toMatch(/Plage 1/);
  });

  it(`rejette un ensemble dont la somme dépasse ${MAX_TOTAL_LABELS} étiquettes`, () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges: [
        { startCode: "1A10", endCode: "1Z90" },
        { startCode: "1A10", endCode: "1ZZ0" },
      ],
    });
    expect(result.success).toBe(false);
    const message = result.error?.issues[0]?.message ?? "";
    expect(message).toMatch(/1000/i);
  });

  it("rejette une plage inversée (début après fin) en désignant la plage", () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges: [{ startCode: "1A15", endCode: "1A10" }],
    });
    expect(result.success).toBe(false);
    const message = result.error?.issues[0]?.message ?? "";
    expect(message).toMatch(/fin|après/i);
    expect(message).toMatch(/Plage 1/);
  });

  it("rejette une plage en ordre cassé au niveau sous-position (1A19 → 1A21)", () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges: [{ startCode: "1A19", endCode: "1A21" }],
    });
    expect(result.success).toBe(false);
    const message = result.error?.issues[0]?.message ?? "";
    expect(message).toMatch(/fin|après/i);
  });

  it("accepte une plage traversant les espaces (1A10 → 1B10)", () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges: [{ startCode: "1A10", endCode: "1B10" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepte une plage traversant les positions (1A10 → 1A21)", () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges: [{ startCode: "1A10", endCode: "1A21" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejette une plage entre types différents en orientant vers Classique", () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges: [{ startCode: "1A10", endCode: "1#D5" }],
    });
    expect(result.success).toBe(false);
    const message = result.error?.issues[0]?.message ?? "";
    expect(message).toMatch(/Dynamique|Classique/i);
  });

  it("désigne la plage fautive dans un ensemble multi-plages (Plage 2)", () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges: [
        { startCode: "1A10", endCode: "1A12" },
        { startCode: "1A99", endCode: "1A90" },
      ],
    });
    expect(result.success).toBe(false);
    const message = result.error?.issues[0]?.message ?? "";
    expect(message).toMatch(/Plage 2/);
  });

  it("rejette un ensemble sans plage (ranges vide)", () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges: [],
    });
    expect(result.success).toBe(false);
  });

  it(`rejette plus de ${MAX_RANGES} plages`, () => {
    const ranges = Array.from({ length: MAX_RANGES + 1 }, (_, index) => ({
      startCode: `1A${index}0`,
      endCode: `1A${index}1`,
    }));
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges,
    });
    expect(result.success).toBe(false);
  });

  it("rejette en mode range l'absence de quantity (champ interdit)", () => {
    const result = locationRequestSchema.safeParse({
      mode: "range",
      locationType: "classic",
      ranges: [{ startCode: "1A10", endCode: "1A1B" }],
      quantity: 5,
    });
    expect(result.success).toBe(false);
  });
});

describe("expandRange — expansion déterministe (par plage)", () => {
  it("développe 1A10 → 1A1B en 12 codes (0-9 puis A-Z)", () => {
    const codes = expandRange("1A10", "1A1B");
    expect(codes).toHaveLength(12);
    expect(codes[0]).toBe("1A10");
    expect(codes[9]).toBe("1A19");
    expect(codes[10]).toBe("1A1A");
    expect(codes[11]).toBe("1A1B");
  });

  it("traverse 1A1A entre 1A19 et 1A1B", () => {
    const codes = expandRange("1A19", "1A1B");
    expect(codes).toEqual(["1A19", "1A1A", "1A1B"]);
  });

  it("développe une plage de un seul code", () => {
    expect(expandRange("1A90", "1A90")).toEqual(["1A90"]);
  });

  it("traverse un espace en 2 codes (1A10 → 1B10)", () => {
    expect(expandRange("1A10", "1B10")).toEqual(["1A10", "1B10"]);
  });

  it("génère une boîte bornée pour 1B10 → 1D45 (72 codes)", () => {
    const codes = expandRange("1B10", "1D45");
    expect(codes).toHaveLength(72);
    expect(codes[0]).toBe("1B10");
    expect(codes[5]).toBe("1B15");
    expect(codes[6]).toBe("1B20");
    expect(codes[23]).toBe("1B45");
    expect(codes[24]).toBe("1C10");
    expect(codes[codes.length - 1]).toBe("1D45");
  });

  it("génère une grille bornée par les sous-positions (1A10 → 1A21)", () => {
    expect(expandRange("1A10", "1A21")).toEqual([
      "1A10",
      "1A11",
      "1A20",
      "1A21",
    ]);
  });

  it("développe une plage dynamique par sous-position (1#D0 → 1#DZ)", () => {
    const codes = expandRange("1#D0", "1#DZ");
    expect(codes).toHaveLength(36);
    expect(codes[0]).toBe("1#D0");
    expect(codes[35]).toBe("1#DZ");
  });

  it("lève une erreur sur des zones différentes", () => {
    expect(() => expandRange("1A10", "2A10")).toThrow(/zone/i);
  });

  it("lève une erreur sur une plage inversée", () => {
    expect(() => expandRange("1A15", "1A10")).toThrow(/fin|après/i);
  });
});

describe("expandRanges — concaténation dans l'ordre d'affichage (SC-002)", () => {
  it("enchaîne les deux plages, première plage d'abord", () => {
    const codes = expandRanges([
      { startCode: "1A10", endCode: "1A12" },
      { startCode: "2B10", endCode: "2B14" },
    ]);
    expect(codes).toEqual([
      "1A10",
      "1A11",
      "1A12",
      "2B10",
      "2B11",
      "2B12",
      "2B13",
      "2B14",
    ]);
  });

  it("retourne un tableau vide pour un ensemble vide", () => {
    expect(expandRanges([])).toEqual([]);
  });
});

describe("rangeSize — taille de plage (boîte, FR-004)", () => {
  it("mesure une colonne de sous-positions (1A10 → 1A1B = 12)", () => {
    expect(rangeSize("1A10", "1A1B")).toBe(12);
  });

  it("mesure une boîte multi-groupes (1B10 → 1D45 = 72)", () => {
    expect(rangeSize("1B10", "1D45")).toBe(72);
  });

  it("mesure une plage dynamique (1#D0 → 1#DZ = 36)", () => {
    expect(rangeSize("1#D0", "1#DZ")).toBe(36);
  });
});

describe("totalRangeSizeIssue — cumul borné à MAX_TOTAL_LABELS (FR-010)", () => {
  it("accepte une somme ≤ 1000", () => {
    expect(totalRangeSizeIssue([999])).toBeNull();
    expect(totalRangeSizeIssue([600, 400])).toBeNull();
  });

  it("rejette une somme > 1000", () => {
    const issue = totalRangeSizeIssue([600, 500]);
    expect(issue).toMatch(/1000/i);
  });
});