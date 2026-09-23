import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsFooter } from "@/components/settings-footer";
import type { PaperSize } from "@/lib/paper-sizes";

const { readSettingsMock, writeSettingsMock } = vi.hoisted(() => ({
  readSettingsMock: vi.fn(() => ({})),
  writeSettingsMock: vi.fn(),
}));

vi.mock("@/lib/print-settings-cookie", () => ({
  readPrintSettings: readSettingsMock,
  writePrintSettings: writeSettingsMock,
}));

const PAPER_SIZES: PaperSize[] = [
  { id: "40x25", widthMm: 40, heightMm: 25, surfaceMm2: 1000, label: "40 × 25 mm" },
  { id: "50x25", widthMm: 50, heightMm: 25, surfaceMm2: 1250, label: "50 × 25 mm" },
  { id: "100x50", widthMm: 100, heightMm: 50, surfaceMm2: 5000, label: "100 × 50 mm" },
];

function renderFooter() {
  render(
    <SettingsFooter paperSizes={PAPER_SIZES} defaultPaperId="40x25" />
  );
}

async function chooseOption(name: RegExp) {
  const option = await screen.findByRole("option", { name });
  fireEvent.pointerDown(option);
  fireEvent.click(option);
}

describe("SettingsFooter — réglage du papier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readSettingsMock.mockReturnValue({});
  });

  it("affiche la section Paramètres avec un sélecteur « Papier »", () => {
    renderFooter();

    expect(screen.getByText("Paramètres")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: /Papier/ })).toBeTruthy();
  });

  it("présélectionne le format par défaut", async () => {
    renderFooter();

    const combobox = screen.getByRole("combobox", { name: /Papier/ });
    expect(combobox).toHaveTextContent("40 × 25 mm");

    fireEvent.click(combobox);
    expect(
      await screen.findByRole("option", { name: /40 × 25 mm/ })
    ).toBeInTheDocument();
  });

  it("liste les formats dans l'ordre fourni (surface croissante)", async () => {
    renderFooter();

    fireEvent.click(screen.getByRole("combobox", { name: /Papier/ }));

    const options = await screen.findAllByRole("option");
    const labels = options.map((option) => option.textContent?.trim());
    expect(labels[0]).toContain("40 × 25 mm");
    expect(labels[1]).toContain("50 × 25 mm");
    expect(labels[2]).toContain("100 × 50 mm");
  });

  it("écrit le format choisi dans le réglage cookie", async () => {
    renderFooter();

    fireEvent.click(screen.getByRole("combobox", { name: /Papier/ }));
    await chooseOption(/100 × 50 mm/);

    await waitFor(() =>
      expect(writeSettingsMock).toHaveBeenCalledWith({ paperId: "100x50" })
    );
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: /Papier/ })
      ).toHaveTextContent("100 × 50 mm")
    );
  });

  it("sélectionne le format mémorisé dans le cookie au chargement", async () => {
    readSettingsMock.mockReturnValue({ paperId: "50x25" });
    renderFooter();

    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: /Papier/ })
      ).toHaveTextContent("50 × 25 mm")
    );
  });

  it("retombe sur le format par défaut si le papier du cookie est inconnu", async () => {
    readSettingsMock.mockReturnValue({ paperId: "999x999" });
    renderFooter();

    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: /Papier/ })
      ).not.toHaveTextContent("999 × 999 mm")
    );
    expect(
      screen.getByRole("combobox", { name: /Papier/ })
    ).toHaveTextContent("40 × 25 mm");
  });
});