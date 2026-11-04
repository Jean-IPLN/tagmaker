import { describe, expect, it } from "vitest";

import {
  getLabelModules,
  registerLabelModule,
} from "@/lib/modules/registry";
import type { LabelModule } from "@/lib/modules/registry";

const newModule: LabelModule = {
  id: "custom",
  name: "Custom",
  description: "Un autre format de code-barres",
  href: "/custom",
};

describe("registre des modules", () => {
  it("expose les quatre modules avec leurs métadonnées", () => {
    const modules = getLabelModules();
    expect(modules).toHaveLength(4);
    expect(modules[0]).toEqual({
      id: "ean13",
      name: "EAN-13",
      description: "Imprimer des étiquettes à code-barres EAN-13",
      href: "/ean13",
    });
    expect(modules[1]).toEqual({
      id: "location",
      name: "Emplacement",
      description:
        "Imprimer des étiquettes à code-barres Code 128 (classique ou #D)",
      href: "/emplacement",
    });
    expect(modules[2]).toEqual({
      id: "code128",
      name: "Code 128",
      description: "Imprimer des étiquettes Code 128 à contenu libre",
      href: "/code128",
    });
    expect(modules[3]).toEqual({
      id: "data-matrix",
      name: "Data Matrix",
      description:
        "Imprimer des étiquettes Data Matrix à contenu libre et légende",
      href: "/data-matrix",
    });
  });

  it("permet d'ajouter un module sans modifier les modules existants", () => {
    const before = getLabelModules();

    registerLabelModule(newModule);

    const modules = getLabelModules();
    expect(modules).toHaveLength(5);
    expect(modules.slice(0, before.length)).toEqual(before);
    expect(modules.some((m) => m.id === "custom")).toBe(true);
  });

  it("refuse un module avec un id dupliqué", () => {
    expect(() => registerLabelModule(newModule)).toThrow(/déjà enregistré/i);
  });
});
