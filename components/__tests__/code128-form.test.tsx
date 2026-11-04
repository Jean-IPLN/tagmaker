import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Code128Form } from "@/components/code128-form";
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
const PRINTER_ADDRESS = "192.168.1.99";
const NO_PRINTER_MESSAGE =
  "Aucune imprimante sélectionnée. Choisissez une imprimante dans les paramètres.";

function setPrintSettingsCookie(settings: object): void {
  document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(settings)
  )}; path=/`;
}

function renderForm() {
  render(<Code128Form />);
  return {
    contentInput: screen.getByLabelText("Contenu"),
    quantityInput: screen.getByLabelText("Quantité"),
    submitButton: screen.getByRole("button", { name: /Imprimer/i }),
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Code128Form", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.values(toastMock).forEach((mock) => mock.mockClear());
    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=; Max-Age=0; path=/`;
  });

  it("bloque l'envoi sans imprimante sélectionnée", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    const { contentInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: CONTENT } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(NO_PRINTER_MESSAGE)
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envoie directement la requête pour une quantité ≤ 2 (sans modal)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", labels: 2 }));

    setPrintSettingsCookie({ printerAddress: PRINTER_ADDRESS });

    const { contentInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: CONTENT } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/code128",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            content: CONTENT,
            quantity: 2,
            printerAddress: PRINTER_ADDRESS,
          }),
        })
      )
    );
    expect(screen.queryByText("Imprimer 2 étiquettes ?")).not.toBeInTheDocument();
  });

  it("affiche la confirmation sans requête pour une quantité > 2", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    setPrintSettingsCookie({ printerAddress: PRINTER_ADDRESS });

    const { contentInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: CONTENT } });
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByText("Imprimer 5 étiquettes ?")).toBeInTheDocument()
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("annuler la confirmation conserve la saisie sans impression", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    setPrintSettingsCookie({ printerAddress: PRINTER_ADDRESS });

    const { contentInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: CONTENT } });
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.click(submitButton);
    fireEvent.click(await screen.findByRole("button", { name: /Annuler/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(contentInput).toHaveValue(CONTENT);
  });

  it("confirmer envoie la quantité demandée et affiche le succès", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", labels: 5 }));

    setPrintSettingsCookie({ printerAddress: PRINTER_ADDRESS });

    const { contentInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: CONTENT } });
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.click(submitButton);
    fireEvent.click(await screen.findByRole("button", { name: /Confirmer/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/code128",
        expect.objectContaining({
          body: JSON.stringify({
            content: CONTENT,
            quantity: 5,
            printerAddress: PRINTER_ADDRESS,
          }),
        })
      )
    );
    expect(toastMock.success).toHaveBeenCalledWith(
      "Impression envoyée (5 étiquettes)"
    );
  });

  it("affiche le message d'erreur serveur et conserve la saisie", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(422, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Le contenu ne tient pas sur ce format (9 caractères max).",
        },
      })
    );

    setPrintSettingsCookie({ printerAddress: PRINTER_ADDRESS });

    const { contentInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: CONTENT } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Le contenu ne tient pas sur ce format (9 caractères max)."
      )
    );
    expect(contentInput).toHaveValue(CONTENT);
  });

  it("préfixe les erreurs 503 d'imprimante injoignable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(503, {
        error: {
          code: "PRINTER_UNAVAILABLE",
          message: "Imprimante injoignable ou envoi échoué.",
        },
      })
    );

    setPrintSettingsCookie({ printerAddress: PRINTER_ADDRESS });

    const { contentInput, submitButton } = renderForm();
    fireEvent.change(contentInput, { target: { value: CONTENT } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Imprimante injoignable : Imprimante injoignable ou envoi échoué."
      )
    );
  });
});
