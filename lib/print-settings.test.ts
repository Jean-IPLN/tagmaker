import { describe, expect, it } from "vitest";
import {
  parsePrintSettings,
  serializePrintSettings,
} from "@/lib/print-settings";

describe("parsePrintSettings", () => {
  it("retourne {} pour un JSON invalide", () => {
    expect(parsePrintSettings("{broken-json")).toEqual({});
  });

  it("retourne {} pour une valeur qui n'est pas un objet", () => {
    expect(parsePrintSettings("null")).toEqual({});
    expect(parsePrintSettings("[1,2]")).toEqual({});
    expect(parsePrintSettings("\"papier\"")).toEqual({});
  });

  it("retourne {} si un champ présent a un type incorrect", () => {
    expect(parsePrintSettings(JSON.stringify({ paperId: 42 }))).toEqual({});
    expect(parsePrintSettings(JSON.stringify({ printerAddress: 42 }))).toEqual({});
  });

  it("extrait les deux champs valides", () => {
    const settings = parsePrintSettings(
      JSON.stringify({ paperId: "40x25", printerAddress: "192.168.1.63" })
    );

    expect(settings).toEqual({
      paperId: "40x25",
      printerAddress: "192.168.1.63",
    });
  });

  it("extrait rotated: true", () => {
    const settings = parsePrintSettings(
      JSON.stringify({ paperId: "40x25", rotated: true })
    );

    expect(settings).toEqual({ paperId: "40x25", rotated: true });
  });

  it("traite rotated non booléen comme désactivé sans casser les autres champs", () => {
    const settings = parsePrintSettings(
      JSON.stringify({ paperId: "40x25", rotated: "yes", printerAddress: "192.168.1.5" })
    );

    expect(settings).toEqual({
      paperId: "40x25",
      printerAddress: "192.168.1.5",
      rotated: false,
    });
  });

  it("explicite rotated: false et normalise les valeurs non strictement primitives", () => {
    expect(parsePrintSettings(JSON.stringify({ rotated: false }))).toEqual({
      rotated: false,
    });
    expect(parsePrintSettings(JSON.stringify({ rotated: 0 }))).toEqual({
      rotated: false,
    });
    expect(parsePrintSettings(JSON.stringify({ rotated: null }))).toEqual({
      rotated: false,
    });
  });

  it("n'ajuste jamais un package sans rotated", () => {
    expect(
      parsePrintSettings(JSON.stringify({ paperId: "100x50" }))
    ).toEqual({ paperId: "100x50" });
  });
});

describe("serializePrintSettings", () => {
  it("sérialise le couple papier/imprimante", () => {
    expect(serializePrintSettings({ paperId: "100x50" })).toBe(
      JSON.stringify({ paperId: "100x50" })
    );
  });

  it("sérialise l'orientation activée", () => {
    expect(serializePrintSettings({ rotated: true })).toBe(
      JSON.stringify({ rotated: true })
    );
  });
});