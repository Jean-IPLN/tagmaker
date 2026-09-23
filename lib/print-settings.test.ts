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
});

describe("serializePrintSettings", () => {
  it("sérialise le couple papier/imprimante", () => {
    expect(serializePrintSettings({ paperId: "100x50" })).toBe(
      JSON.stringify({ paperId: "100x50" })
    );
  });
});