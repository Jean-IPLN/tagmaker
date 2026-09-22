import { describe, expect, it } from "vitest";

import { buildEan13Zpl } from "@/lib/zpl/build";

const baseParams = {
  ean13: "5901234123457",
  quantity: 5,
  widthDots: 320,
  heightDots: 200,
};

describe("buildEan13Zpl", () => {
  const zpl = buildEan13Zpl(baseParams);

  it("délimite le flux par ^XA et ^XZ", () => {
    expect(zpl).toContain("^XA");
    expect(zpl).toContain("^XZ");
    expect(zpl.indexOf("^XA")).toBeLessThan(zpl.indexOf("^XZ"));
  });

  it("utilise les dimensions de l'étiquette (^PW320^LL200)", () => {
    expect(zpl).toContain("^PW320^LL200");
  });

  it("utilise le code-barres EAN-13 natif ^BE de hauteur 120", () => {
    expect(zpl).toContain("^BY2,3,120");
    expect(zpl).toContain("^BEN,120,Y,N");
  });

  it("envoie les 12 chiffres de données sans la clé (^FD590123412345)", () => {
    expect(zpl).toContain("^FD590123412345^FS");
    expect(zpl).not.toContain("^FD5901234123457");
  });

  it("fixe le nombre de copies à la quantité (^PQ5)", () => {
    expect(zpl).toContain("^PQ5");
  });
});