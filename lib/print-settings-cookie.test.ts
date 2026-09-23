import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PRINT_SETTINGS_COOKIE_NAME,
  clearPrintSettings,
  readPrintSettings,
  writePrintSettings,
} from "@/lib/print-settings-cookie";

afterEach(() => {
  vi.restoreAllMocks();
  clearPrintSettings();
});

const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/`;
};

describe("readPrintSettings", () => {
  it("retourne {} quand le cookie est absent", () => {
    clearPrintSettings();

    expect(readPrintSettings()).toEqual({});
  });

  it("lit et parse le cookie URL-encodé", () => {
    setCookie(
      PRINT_SETTINGS_COOKIE_NAME,
      JSON.stringify({ paperId: "40x25", printerAddress: "192.168.1.63" })
    );

    expect(readPrintSettings()).toEqual({
      paperId: "40x25",
      printerAddress: "192.168.1.63",
    });
  });

  it("retourne {} quand la valeur est un JSON invalide", () => {
    setCookie(PRINT_SETTINGS_COOKIE_NAME, "{broken-json");

    expect(readPrintSettings()).toEqual({});
  });
});

describe("writePrintSettings", () => {
  it("écrit le cookie avec le bon nom, le Max-Age, path et SameSite", () => {
    clearPrintSettings();
    const cookieWriter = vi.fn();
    vi.spyOn(document, "cookie", "set").mockImplementation(cookieWriter);

    writePrintSettings({ paperId: "100x50" });

    const written = cookieWriter.mock.calls[0][0] as string;
    expect(written).toContain(`${PRINT_SETTINGS_COOKIE_NAME}=`);
    expect(written).toContain("Max-Age=2592000");
    expect(written).toContain("path=/");
    expect(written).toContain("SameSite=Lax");
    expect(written).not.toContain("HttpOnly");
  });

  it("relit la valeur écrite", () => {
    clearPrintSettings();
    writePrintSettings({ paperId: "60x40", printerAddress: "192.168.1.63" });

    expect(readPrintSettings()).toEqual({
      paperId: "60x40",
      printerAddress: "192.168.1.63",
    });
  });

  it("met à jour indépendamment chaque champ en conservant l'autre", () => {
    clearPrintSettings();
    writePrintSettings({ paperId: "100x50" });
    writePrintSettings({ printerAddress: "192.168.1.99" });

    expect(readPrintSettings()).toEqual({
      paperId: "100x50",
      printerAddress: "192.168.1.99",
    });
  });

  it("ne remonte pas d'erreur quand l'écriture échoue", () => {
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {
      throw new Error("cookie disabled");
    });

    expect(() => writePrintSettings({ paperId: "40x25" })).not.toThrow();
  });
});