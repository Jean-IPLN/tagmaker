import { describe, expect, it } from "vitest";

import {
  getLabelModules,
  registerLabelModule,
} from "@/lib/modules/registry";
import type { LabelModule } from "@/lib/modules/registry";

const newModule: LabelModule = {
  id: "code128",
  name: "Code 128",
  description: "Un autre format de code-barres",
  href: "/code128",
};

describe("registre des modules", () => {
  it("expose ean13 puis le module Emplacement avec leurs métadonnées", () => {
    const modules = getLabelModules();
    expect(modules).toHaveLength(2);
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
  });

  it("permet d'ajouter un module sans modifier ean13 (extensibilité FR-002)", () => {
    const ean13Before = getLabelModules().find((m) => m.id === "ean13");
    const locationBefore = getLabelModules().find((m) => m.id === "location");
    expect(ean13Before).toBeDefined();
    expect(locationBefore).toBeDefined();

    registerLabelModule(newModule);

    const modules = getLabelModules();
    expect(modules).toHaveLength(3);
    expect(modules.find((m) => m.id === "ean13")).toEqual(ean13Before);
    expect(modules.find((m) => m.id === "location")).toEqual(locationBefore);
    expect(modules.some((m) => m.id === "code128")).toBe(true);
  });

  it("refuse un module avec un id dupliqué", () => {
    expect(() => registerLabelModule(newModule)).toThrow(/déjà enregistré/i);
  });
});