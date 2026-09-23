import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

function setValidEnv() {
  process.env.ZPL_PRINTER_HOST = "192.168.1.63";
  process.env.ZPL_PRINTER_PORT = "9100";
  process.env.ZPL_RESOLUTION_DPI = "203";
  process.env.ZPL_PAPER_SIZES = "40x25, 50x25, 60x40, 100x50";
}

describe("lib/env", () => {
  it("valide la configuration d'environnement", async () => {
    setValidEnv();

    const { env } = await import("@/lib/env");

    expect(env.ZPL_PRINTER_HOST).toBe("192.168.1.63");
    expect(env.ZPL_PRINTER_PORT).toBe(9100);
    expect(env.ZPL_RESOLUTION_DPI).toBe(203);
    expect(env.ZPL_PAPER_SIZES).toBe("40x25, 50x25, 60x40, 100x50");
  });

  it("échoue rapidement si la configuration est invalide", async () => {
    process.env.ZPL_PRINTER_HOST = "";
    process.env.ZPL_PRINTER_PORT = "abc";
    process.env.ZPL_RESOLUTION_DPI = "203";
    process.env.ZPL_PAPER_SIZES = "40x25, 50x25, 60x40, 100x50";

    await expect(import("@/lib/env")).rejects.toThrow(/invalide/i);
  });

  it("échoue si ZPL_PAPER_SIZES est absente ou vide", async () => {
    setValidEnv();
    delete process.env.ZPL_PAPER_SIZES;

    await expect(import("@/lib/env")).rejects.toThrow(/invalide/i);
  });
});