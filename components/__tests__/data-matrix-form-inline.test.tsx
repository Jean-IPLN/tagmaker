import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataMatrixForm } from "@/components/data-matrix-form";
import { PRINT_SETTINGS_COOKIE_NAME } from "@/lib/print-settings-cookie";

const { toastMock } = vi.hoisted(() => ({
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast: toastMock }));

const CONTENT = "REF-2026-A17";
const LEGEND = "Palette 42";
const PRINTER_ADDRESS = "192.168.1.99";

function setPrintSettingsCookie(): void {
  document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify({ printerAddress: PRINTER_ADDRESS })
  )}; path=/`;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function renderForm() {
  render(<DataMatrixForm />);
  return {
    contentInput: screen.getByLabelText("Contenu"),
    legendInput: screen.getByLabelText("Légende"),
    quantityInput: screen.getByLabelText("Quantité"),
    inlineSwitch: screen.getByRole("switch", { name: "Affichage in-line" }),
    submitButton: screen.getByRole("button", { name: /Imprimer/i }),
  };
}

describe("DataMatrixForm — affichage in-line", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.values(toastMock).forEach((mock) => mock.mockClear());
    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=; Max-Age=0; path=/`;
    setPrintSettingsCookie();
  });

  it("affiche le commutateur désactivé avec son aide", () => {
    const { inlineSwitch } = renderForm();

    expect(inlineSwitch).toHaveAttribute("aria-checked", "false");
    expect(
      screen.getByText(
        "Légende à droite du code, sur la même ligne (orientation normale)."
      )
    ).toBeInTheDocument();
  });

  it("envoie inline: true uniquement lorsque le commutateur est activé", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", labels: 1 }));

    const { contentInput, legendInput, inlineSwitch, submitButton } =
      renderForm();
    fireEvent.change(contentInput, { target: { value: CONTENT } });
    fireEvent.change(legendInput, { target: { value: LEGEND } });
    fireEvent.click(inlineSwitch);

    expect(inlineSwitch).toHaveAttribute("aria-checked", "true");

    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/data-matrix",
        expect.objectContaining({
          body: JSON.stringify({
            content: CONTENT,
            legend: LEGEND,
            quantity: 1,
            inline: true,
            printerAddress: PRINTER_ADDRESS,
          }),
        })
      )
    );
  });

  it("conserve l'état du commutateur dans la confirmation > 2", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", labels: 5 }));

    const { contentInput, legendInput, quantityInput, inlineSwitch, submitButton } =
      renderForm();
    fireEvent.change(contentInput, { target: { value: CONTENT } });
    fireEvent.change(legendInput, { target: { value: LEGEND } });
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.click(inlineSwitch);
    fireEvent.click(submitButton);

    fireEvent.click(await screen.findByRole("button", { name: /Confirmer/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/data-matrix",
        expect.objectContaining({
          body: JSON.stringify({
            content: CONTENT,
            legend: LEGEND,
            quantity: 5,
            inline: true,
            printerAddress: PRINTER_ADDRESS,
          }),
        })
      )
    );
    expect(screen.getByLabelText("Contenu")).toHaveValue(CONTENT);
    expect(inlineSwitch).toHaveAttribute("aria-checked", "true");
  });
});
