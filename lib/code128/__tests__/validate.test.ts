import { describe, expect, it } from "vitest";

import { code128RequestSchema } from "@/lib/code128/validate";

function parse(content: unknown, quantity: unknown = 1) {
  return code128RequestSchema.safeParse({ content, quantity });
}

function issueMessage(result: ReturnType<typeof parse>): string | undefined {
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("code128RequestSchema — contenu", () => {
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

  it("accepte exactement 80 caractères et refuse 81", () => {
    expect(parse("A".repeat(80)).success).toBe(true);
    expect(issueMessage(parse("A".repeat(81)))).toBe(
      "Le contenu ne peut pas dépasser 80 caractères"
    );
  });

  it("refuse les accents, emoji et caractères de contrôle", () => {
    const asciiMessage =
      "Le contenu ne peut contenir que des caractères ASCII imprimables";

    expect(issueMessage(parse("café"))).toBe(asciiMessage);
    expect(issueMessage(parse("AB😀"))).toBe(asciiMessage);
    expect(issueMessage(parse("A\nB"))).toBe(asciiMessage);
    expect(issueMessage(parse("A\tB"))).toBe(asciiMessage);
    expect(issueMessage(parse("A~B"))).toBeUndefined();
  });

  it("refuse un contenu absent ou non textuel", () => {
    expect(issueMessage(parse(undefined))).toBe("Le contenu est requis");
    expect(issueMessage(parse(42))).toBe("Le contenu est requis");
  });
});

describe("code128RequestSchema — quantité et options", () => {
  it("accepte une quantité entière de 1 à 1000", () => {
    expect(parse("ABC", 1).success).toBe(true);
    expect(parse("ABC", 1000).success).toBe(true);
  });

  it("refuse une quantité nulle, négative, non entière ou hors plafond", () => {
    expect(issueMessage(parse("ABC", 0))).toBe(
      "La quantité doit être au moins 1"
    );
    expect(issueMessage(parse("ABC", -3))).toBe(
      "La quantité doit être au moins 1"
    );
    expect(issueMessage(parse("ABC", 1001))).toBe(
      "La quantité ne peut pas dépasser 1000"
    );
    expect(issueMessage(parse("ABC", 1.5))).toBe(
      "La quantité doit être un nombre entier"
    );
    expect(issueMessage(parse("ABC", "5"))).toBe(
      "La quantité doit être un nombre"
    );
  });

  it("accepte les réglages partagés et refuse un champ inconnu", () => {
    const valid = code128RequestSchema.safeParse({
      content: "ABC",
      quantity: 1,
      paperId: "40x25",
      printerAddress: "192.168.1.50",
      rotated: true,
    });
    expect(valid.success).toBe(true);

    const unknown = code128RequestSchema.safeParse({
      content: "ABC",
      quantity: 1,
      mode: "range",
    });
    expect(unknown.success).toBe(false);
  });
});
