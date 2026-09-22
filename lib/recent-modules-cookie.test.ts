import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RECENT_COOKIE_NAME,
  readRecentCookie,
  writeRecentCookie,
} from "@/lib/recent-modules-cookie";

const NOW = 1_000_000_000_000;

afterEach(() => {
  vi.restoreAllMocks();
});

const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/`;
};

describe("readRecentCookie", () => {
  it("retourne [] quand le cookie est absent", () => {
    document.cookie = "tagmaker_recent_modules=; Max-Age=0";

    expect(readRecentCookie()).toEqual([]);
  });

  it("lit et décode les entrées du cookie", () => {
    setCookie(
      RECENT_COOKIE_NAME,
      JSON.stringify([{ moduleId: "ean13", lastUsedAt: NOW }])
    );

    expect(readRecentCookie()).toEqual([
      { moduleId: "ean13", lastUsedAt: NOW },
    ]);
  });

  it("retourne [] quand la valeur est un JSON invalide", () => {
    setCookie(RECENT_COOKIE_NAME, "{broken-json");

    expect(readRecentCookie()).toEqual([]);
  });
});

describe("writeRecentCookie", () => {
  it("écrit le cookie avec le bon nom et un Max-Age de 30 jours", () => {
    const cookieWriter = vi.fn();
    vi.spyOn(document, "cookie", "set").mockImplementation(cookieWriter);

    writeRecentCookie([{ moduleId: "ean13", lastUsedAt: NOW }]);

    const written = cookieWriter.mock.calls[0][0] as string;
    expect(written).toContain(`${RECENT_COOKIE_NAME}=`);
    expect(written).toContain("Max-Age=2592000");
    expect(written).toContain("path=/");
    expect(written).toContain("SameSite=Lax");
  });

  it("relit la valeur écrite", () => {
    const entries = [{ moduleId: "ean13", lastUsedAt: NOW }];

    writeRecentCookie(entries);

    expect(readRecentCookie()).toEqual(entries);
  });

  it("ne remonte pas d'erreur quand l'écriture échoue", () => {
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {
      throw new Error("cookie disabled");
    });

    expect(() => writeRecentCookie([])).not.toThrow();
  });
});