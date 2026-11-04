import { describe, expect, it } from "vitest";

import { dataMatrixRequestSchema } from "@/lib/data-matrix/validate";

function parse(
  content: unknown,
  legend: unknown = undefined,
  quantity: unknown = 1
) {
  return dataMatrixRequestSchema.safeParse({ content, legend, quantity });
}

function issueMessage(result: ReturnType<typeof parse>): string | undefined {
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("dataMatrixRequestSchema — contenu", () => {
  it("accepte un contenu alphanumérique et conserve la casse", () => {
    const result = parse("REF-2026-A17");

    expect(result.success).toBe(true);
    expect(result.success && result.data.content).toBe("REF-2026-A17");
  });

  it("supprime les espaces de début et de fin, conserve les espaces internes", () => {
    const result = parse("  A B-12  ");

    expect(result.success).toBe(true);
    expect(result.success && result.data.content).toBe("A B-12");
  });

  it("refuse un contenu vide ou composé uniquement d'espaces", () => {
    expect(issueMessage(parse(""))).toBe("Le contenu est requis");
    expect(issueMessage(parse("   "))).toBe("Le contenu est requis");
  });

  it("accepte exactement 200 caractères et refuse 201", () => {
    expect(parse("A".repeat(200)).success).toBe(true);
    expect(issueMessage(parse("A".repeat(201)))).toBe(
      "Le contenu ne peut pas dépasser 200 caractères"
    );
  });

  it("refuse les accents, emoji et caractères de contrôle", () => {
    const asciiMessage =
      "Le contenu ne peut contenir que des caractères ASCII imprimables";

    expect(issueMessage(parse("café"))).toBe(asciiMessage);
    expect(issueMessage(parse("AB😀"))).toBe(asciiMessage);
    expect(issueMessage(parse("A\nB"))).toBe(asciiMessage);
    expect(issueMessage(parse("A\tB"))).toBe(asciiMessage);
    expect(issueMessage(parse("A_B^C~D>"))).toBeUndefined();
  });

  it("refuse un contenu absent ou non textuel", () => {
    expect(issueMessage(parse(undefined))).toBe("Le contenu est requis");
    expect(issueMessage(parse(42))).toBe("Le contenu est requis");
  });
});

describe("dataMatrixRequestSchema — légende", () => {
  it("normalise une légende absente ou vide en chaîne vide", () => {
    const absent = parse("ABC");
    const blank = parse("ABC", "   ");

    expect(absent.success && absent.data.legend).toBe("");
    expect(blank.success && blank.data.legend).toBe("");
  });

  it("supprime les espaces de bord et conserve la casse interne", () => {
    const result = parse("ABC", "  Palette 42  ");

    expect(result.success && result.data.legend).toBe("Palette 42");
  });

  it("accepte exactement 60 caractères et refuse 61", () => {
    expect(parse("ABC", "L".repeat(60)).success).toBe(true);
    expect(issueMessage(parse("ABC", "L".repeat(61)))).toBe(
      "La légende ne peut pas dépasser 60 caractères"
    );
  });

  it("refuse les accents, emoji et caractères de contrôle", () => {
    const asciiMessage =
      "La légende ne peut contenir que des caractères ASCII imprimables";

    expect(issueMessage(parse("ABC", "Café"))).toBe(asciiMessage);
    expect(issueMessage(parse("ABC", "Lot😀"))).toBe(asciiMessage);
    expect(issueMessage(parse("ABC", "Lot\n5"))).toBe(asciiMessage);
    expect(issueMessage(parse("ABC", "Lot_5^A~B"))).toBeUndefined();
  });

  it("refuse une légende non textuelle", () => {
    expect(issueMessage(parse("ABC", 42))).toBe(
      "La légende ne peut contenir que des caractères ASCII imprimables"
    );
  });
});

describe("dataMatrixRequestSchema — quantité et options", () => {
  it("accepte les réglages partagés et refuse un champ inconnu", () => {
    const valid = dataMatrixRequestSchema.safeParse({
      content: "ABC",
      legend: "Palette 42",
      quantity: 1,
      paperId: "40x25",
      printerAddress: "192.168.1.50",
      rotated: true,
    });
    expect(valid.success).toBe(true);

    const unknown = dataMatrixRequestSchema.safeParse({
      content: "ABC",
      quantity: 1,
      mode: "range",
    });
    expect(unknown.success).toBe(false);
  });

  it("refuse une quantité absente, nulle, non entière ou hors plafond", () => {
    expect(issueMessage(parse("ABC", undefined, 0))).toBe(
      "La quantité doit être au moins 1"
    );
    expect(issueMessage(parse("ABC", undefined, 1001))).toBe(
      "La quantité ne peut pas dépasser 1000"
    );
    expect(issueMessage(parse("ABC", undefined, 1.5))).toBe(
      "La quantité doit être un nombre entier"
    );
    expect(issueMessage(parse("ABC", undefined, "5"))).toBe(
      "La quantité doit être un nombre"
    );
  });
});
