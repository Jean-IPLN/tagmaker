import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

let mockCookieValue: string | undefined = undefined;

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: () =>
      mockCookieValue === undefined
        ? undefined
        : { name: "tagmaker_recent_modules", value: mockCookieValue },
  }),
}));

const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

describe("Home (accueil, lecture SSR du cookie)", () => {
  beforeEach(() => {
    mockCookieValue = undefined;
  });

  it("affiche la galerie avec les entrées valides du cookie", async () => {
    mockCookieValue = JSON.stringify([
      { moduleId: "ean13", lastUsedAt: NOW },
    ]);

    const { container } = render(await Home());
    expect(container.querySelector("a[href='/ean13']")).toBeTruthy();
  });

  it("affiche le squelette quand le cookie est absent", async () => {
    const { container } = render(await Home());

    expect(screen.getByRole("status")).toBeTruthy();
    expect(container.querySelector("a[href='/ean13']")).toBeNull();
  });

  it("ignore une entrée expirée (plus de 30 jours) → squelette", async () => {
    mockCookieValue = JSON.stringify([
      { moduleId: "ean13", lastUsedAt: NOW - 31 * DAY_MS },
    ]);

    const { container } = render(await Home());

    expect(screen.getByRole("status")).toBeTruthy();
    expect(container.querySelector("a[href='/ean13']")).toBeNull();
  });

  it("n'affiche qu'une carte par module même si le cookie contient des doublons", async () => {
    mockCookieValue = JSON.stringify([
      { moduleId: "ean13", lastUsedAt: NOW },
      { moduleId: "ean13", lastUsedAt: NOW - 1000 },
    ]);

    const { container } = render(await Home());

    expect(container.querySelectorAll("a[href='/ean13']")).toHaveLength(1);
  });

  it("ne plante pas sur un cookie JSON invalide → squelette", async () => {
    mockCookieValue = "not-json";

    const { container } = render(await Home());

    expect(screen.getByRole("status")).toBeTruthy();
    expect(container.querySelector("a[href='/ean13']")).toBeNull();
  });
});