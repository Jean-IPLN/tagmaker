import { describe, expect, it } from "vitest";
import {
  MAX_RECENT_MODULES,
  filterValidEntries,
  getRecentModuleIds,
  parseEntries,
  recordModule,
  serializeEntries,
} from "@/lib/recent-modules";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 1_000_000_000_000;

const entry = (moduleId: string, ageDays: number) => ({
  moduleId,
  lastUsedAt: NOW - ageDays * DAY_MS,
});

describe("recordModule", () => {
  it("ajoute un module absent en tête de la liste", () => {
    const entries = [entry("a", 10), entry("b", 5)];

    const result = recordModule(entries, "c", NOW);

    expect(result[0]).toEqual({ moduleId: "c", lastUsedAt: NOW });
    expect(result).toHaveLength(3);
  });

  it("re-consulter un module présent le remonte en tête sans doublon", () => {
    const entries = [entry("a", 10), entry("b", 5)];

    const result = recordModule(entries, "b", NOW);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ moduleId: "b", lastUsedAt: NOW });
    expect(result[1].moduleId).toBe("a");
  });

  it("tronque la liste à MAX_RECENT_MODULES (4)", () => {
    const entries = [entry("a", 1), entry("b", 2), entry("c", 3), entry("d", 4)];

    const result = recordModule(entries, "e", NOW);

    expect(result).toHaveLength(4);
    expect(result.map((e) => e.moduleId)).toEqual(["e", "a", "b", "c"]);
  });

  it("ne mute pas la liste d'entrée (immutabilité)", () => {
    const entries = [entry("a", 1)];
    const snapshot = [...entries];

    recordModule(entries, "b", NOW);

    expect(entries).toEqual(snapshot);
    expect(MAX_RECENT_MODULES).toBe(4);
  });
});

describe("filterValidEntries", () => {
  it("exclut une entrée non consultée depuis plus de 30 jours (FR-010)", () => {
    const entries = [entry("a", 31), entry("b", 29), entry("c", 30)];

    const result = filterValidEntries(entries, ["a", "b", "c"], NOW);

    expect(result.map((e) => e.moduleId)).toEqual(["b", "c"]);
  });

  it("exclut une entrée dont le moduleId est hors catalogue (FR-009)", () => {
    const entries = [entry("a", 1), entry("ghost", 1)];

    const result = filterValidEntries(entries, ["a"], NOW);

    expect(result.map((e) => e.moduleId)).toEqual(["a"]);
  });

  it("seuil inclusif : 30 jours exactement reste valide", () => {
    const entries = [entry("a", 30)];

    const result = filterValidEntries(entries, ["a"], NOW);

    expect(result.map((e) => e.moduleId)).toEqual(["a"]);
  });
});

describe("getRecentModuleIds", () => {
  it("ordonne du plus récent au plus ancien", () => {
    const entries = [entry("a", 20), entry("b", 3), entry("c", 9)];

    const result = getRecentModuleIds(entries, ["a", "b", "c"], NOW);

    expect(result).toEqual(["b", "c", "a"]);
  });

  it("filtre expirés et hors catalogue, et tronque à 4", () => {
    const entries = [
      entry("a", 31),
      entry("b", 1),
      entry("c", 2),
      entry("d", 3),
      entry("e", 4),
      entry("ghost", 5),
    ];

    const result = getRecentModuleIds(entries, ["a", "b", "c", "d", "e"], NOW);

    expect(result).toEqual(["b", "c", "d", "e"]);
  });

  it("retourne une liste vide quand rien n'est valide", () => {
    const entries = [entry("a", 31)];

    expect(getRecentModuleIds(entries, ["a"], NOW)).toEqual([]);
  });

  it("déduplique les entrées répétées du même module (lecture défensive)", () => {
    const entries = [entry("a", 5), entry("a", 1), entry("b", 2)];

    const result = getRecentModuleIds(entries, ["a", "b"], NOW);

    expect(result).toEqual(["a", "b"]);
  });
});

describe("serializeEntries / parseEntries", () => {
  it("sérialise puis relit les entrées", () => {
    const entries = [entry("ean13", 1)];

    expect(parseEntries(serializeEntries(entries))).toEqual(entries);
  });

  it("retourne [] pour une chaîne JSON invalide", () => {
    expect(parseEntries("not-json")).toEqual([]);
  });

  it("retourne [] pour un JSON de forme inattendue", () => {
    expect(parseEntries('{"foo":"bar"}')).toEqual([]);
    expect(parseEntries("[1,2,3]")).toEqual([]);
  });

  it("écarte individuellement les entrées mal formées", () => {
    const raw = JSON.stringify([
      { moduleId: "ean13", lastUsedAt: 123 },
      { lastUsedAt: 456 },
      { moduleId: "x", lastUsedAt: "not-a-number" },
    ]);

    const result = parseEntries(raw);

    expect(result).toEqual([{ moduleId: "ean13", lastUsedAt: 123 }]);
  });
});