import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("favicon « tag »", () => {
  it("fournit app/icon.svg avec le pictogramme phosphor du tag", () => {
    const iconPath = join(process.cwd(), "app", "icon.svg");

    expect(existsSync(iconPath)).toBe(true);

    const svg = readFileSync(iconPath, "utf-8");
    expect(svg).toContain("<svg");
    expect(svg).toContain('viewBox="0 0 256 256"');
    expect(svg).toContain("M243.31,136,144,36.69");
  });

  it("retire l'icône générique par défaut favicon.ico", () => {
    const faviconPath = join(process.cwd(), "app", "favicon.ico");

    expect(existsSync(faviconPath)).toBe(false);
  });
});