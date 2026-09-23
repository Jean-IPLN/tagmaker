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

describe("SettingsFooter — réglage du papier (US1)", () => {
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

function jsonDiscoverResponse(
  printers: { address: string; port: number }[]
): Response {
  return new Response(JSON.stringify({ printers }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("SettingsFooter — réglage de l'imprimante (US2)", () => {
  beforeEach(() => {
    readSettingsMock.mockReturnValue({});
  });

  it("affiche « Non défini » en état warn quand aucune imprimante n'est définie", () => {
    renderFooter();

    const combobox = screen.getByRole("combobox", { name: /Imprimante/ });
    expect(combobox).toHaveTextContent("Non défini");
    expect(combobox).toHaveClass("border-amber-500");
    expect(combobox.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.queryByText(/Imprimante non définie/)).not.toBeInTheDocument();
  });

  it("sélectionne l'imprimante du cookie sans scanner le réseau", async () => {
    readSettingsMock.mockReturnValue({ printerAddress: "192.168.1.99" });
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderFooter();

    const combobox = await screen.findByRole("combobox", { name: /Imprimante/ });
    await waitFor(() => expect(combobox).toHaveTextContent("192.168.1.99"));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(combobox).not.toHaveClass("border-amber-500");
    expect(screen.queryByText("Non défini")).not.toBeInTheDocument();
  });

  it("lance le scan réseau à l'ouverture et affiche « Recherche des imprimantes… »", async () => {
    let resolveScan!: (value: Response) => void;
    const scanPromise = new Promise<Response>((resolve) => {
      resolveScan = resolve;
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(scanPromise);
    renderFooter();

    fireEvent.click(screen.getByRole("combobox", { name: /Imprimante/ }));
    expect(fetchMock).toHaveBeenCalledWith("/api/printers/discover");
    expect(
      await screen.findByText("Recherche des imprimantes…")
    ).toBeInTheDocument();

    resolveScan(jsonDiscoverResponse([{ address: "192.168.1.77", port: 9100 }]));
    expect(
      await screen.findByRole("option", { name: /192\.168\.1\.77/ })
    ).toBeInTheDocument();
  });

  it("affiche un spinner pendant la recherche puis le masque à la fin", async () => {
    let resolveScan!: (value: Response) => void;
    const scanPromise = new Promise<Response>((resolve) => {
      resolveScan = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockReturnValue(scanPromise);
    renderFooter();

    fireEvent.click(screen.getByRole("combobox", { name: /Imprimante/ }));

    await screen.findByText("Recherche des imprimantes…");
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).not.toBeNull();
    expect(spinner).toHaveAttribute("aria-hidden", "true");

    resolveScan(jsonDiscoverResponse([]));
    await screen.findByText("Aucune imprimante détectée");
    expect(document.querySelector(".animate-spin")).toBeNull();
  });

  it("affiche « Aucune imprimante détectée » pour un scan vide", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonDiscoverResponse([]));
    renderFooter();

    fireEvent.click(screen.getByRole("combobox", { name: /Imprimante/ }));
    expect(
      await screen.findByText("Aucune imprimante détectée")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /Imprimante/ })
    ).toHaveTextContent("Non défini");
  });

  it("mémorise la sélection de l'imprimante dans le réglage cookie", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonDiscoverResponse([{ address: "192.168.1.77", port: 9100 }])
    );
    renderFooter();

    fireEvent.click(screen.getByRole("combobox", { name: /Imprimante/ }));
    await chooseOption(/192\.168\.1\.77/);

    await waitFor(() =>
      expect(writeSettingsMock).toHaveBeenCalledWith({
        printerAddress: "192.168.1.77",
      })
    );
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: /Imprimante/ })
      ).toHaveTextContent("192.168.1.77")
    );
    expect(screen.queryByText("Non défini")).not.toBeInTheDocument();
  });
});

describe("SettingsFooter — bouton Actualiser (US3)", () => {
  beforeEach(() => {
    readSettingsMock.mockReturnValue({});
  });

  it("absent pendant le scan, visible quand la recherche est terminée", async () => {
    let resolveScan!: (value: Response) => void;
    const scanPromise = new Promise<Response>((resolve) => {
      resolveScan = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockReturnValue(scanPromise);
    renderFooter();

    fireEvent.click(screen.getByRole("combobox", { name: /Imprimante/ }));
    await screen.findByText("Recherche des imprimantes…");
    expect(
      screen.queryByRole("button", { name: /Actualiser/ })
    ).toBeNull();

    resolveScan(jsonDiscoverResponse([]));
    expect(
      await screen.findByRole("button", { name: /Actualiser/ })
    ).toBeInTheDocument();
  });

  it("relance une nouvelle recherche au clic et réaffiche le spinner", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonDiscoverResponse([]));
    renderFooter();

    fireEvent.click(screen.getByRole("combobox", { name: /Imprimante/ }));
    const refreshButton = await screen.findByRole("button", {
      name: /Actualiser/,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    let resolveSecondScan!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveSecondScan = resolve;
      })
    );
    fireEvent.click(refreshButton);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByText("Recherche des imprimantes…");
    expect(
      screen.queryByRole("button", { name: /Actualiser/ })
    ).toBeNull();

    resolveSecondScan(jsonDiscoverResponse([]));
    expect(
      await screen.findByRole("button", { name: /Actualiser/ })
    ).toBeInTheDocument();
  });

  it("relance le scan même avec une imprimante déjà sélectionnée, sans l'effacer", async () => {
    readSettingsMock.mockReturnValue({ printerAddress: "192.168.1.99" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonDiscoverResponse([{ address: "192.168.1.77", port: 9100 }])
    );
    renderFooter();

    fireEvent.click(screen.getByRole("combobox", { name: /Imprimante/ }));
    const refreshButton = await screen.findByRole("button", {
      name: /Actualiser/,
    });
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(refreshButton);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByRole("option", { name: /192\.168\.1\.77/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /Imprimante/ })
    ).toHaveTextContent("192.168.1.99");
  });
});