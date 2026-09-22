import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

function setValidEnv() {
  process.env.ZPL_PRINTER_HOST = "192.168.1.63";
  process.env.ZPL_PRINTER_PORT = "9100";
  process.env.ZPL_LABEL_WIDTH_MM = "40";
  process.env.ZPL_LABEL_HEIGHT_MM = "25";
  process.env.ZPL_RESOLUTION_DPI = "203";
}

describe("lib/env", () => {
  it("valide la configuration et calcule les dimensions en dots", async () => {
    setValidEnv();

    const { env, LABEL_WIDTH_DOTS, LABEL_HEIGHT_DOTS } = await import(
      "@/lib/env"
    );

    expect(env.ZPL_PRINTER_HOST).toBe("192.168.1.63");
    expect(env.ZPL_PRINTER_PORT).toBe(9100);
    expect(LABEL_WIDTH_DOTS).toBe(320);
    expect(LABEL_HEIGHT_DOTS).toBe(200);
  });

  it("échoue rapidement si la configuration est invalide", async () => {
    process.env.ZPL_PRINTER_HOST = "";
    process.env.ZPL_PRINTER_PORT = "abc";
    process.env.ZPL_LABEL_WIDTH_MM = "40";
    process.env.ZPL_LABEL_HEIGHT_MM = "25";
    process.env.ZPL_RESOLUTION_DPI = "203";

    await expect(import("@/lib/env")).rejects.toThrow(/invalide/i);
  });
});