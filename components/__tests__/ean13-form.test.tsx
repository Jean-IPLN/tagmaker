import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Ean13Form } from "@/components/ean13-form";
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

const VALID_BODY = { ean13: "5901234123457", quantity: 5 };

function renderForm() {
  render(<Ean13Form />);
  return {
    codeInput: screen.getByLabelText("Code EAN-13"),
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

describe("Ean13Form", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.values(toastMock).forEach((mock) => mock.mockClear());
    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=; Max-Age=0; path=/`;
  });

  it("n'envoie aucune requête si l'EAN-13 est invalide", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    const { codeInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: "5901234123456" } });
    fireEvent.click(submitButton);

    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
    expect(toastMock.error).toHaveBeenCalledWith(
      expect.stringMatching(/clé de contrôle/)
    );
  });

  it("envoie directement la requête pour une quantité ≤ 2 (sans modal)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", quantity: 2 }));

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: "5901234123457" } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/ean13",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ ean13: "5901234123457", quantity: 2 }),
        })
      )
    );
    expect(
      screen.queryByText("Imprimer 2 étiquettes ?")
    ).not.toBeInTheDocument();
  });

  it("affiche la modal critique sans requête pour une quantité > 2", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByText("Imprimer 5 étiquettes ?")).toBeInTheDocument()
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("annuler la modal ne ferme rien côté requête et conserve les valeurs", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent" }));

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByText("Imprimer 5 étiquettes ?")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Annuler/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect((codeInput as HTMLInputElement).value).toBe(VALID_BODY.ean13);
    expect((quantityInput as HTMLInputElement).value).toBe("5");
  });

  it("confirmer la modal envoie la requête", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", quantity: 5 }));

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByText("Imprimer 5 étiquettes ?")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Confirmer/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/ean13",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(VALID_BODY),
        })
      )
    );
  });

  it("affiche un message clair si l'imprimante est injoignable (503)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(503, {
          error: {
            code: "PRINTER_UNAVAILABLE",
            message: "Imprimante injoignable ou envoi échoué.",
          },
        })
      );

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringMatching(/Imprimante injoignable/)
      )
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("affiche le message d'erreur du serveur pour un conflit (409)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(409, {
        error: {
          code: "PRINT_IN_PROGRESS",
          message: "Une impression est déjà en cours.",
        },
      })
    );

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Une impression est déjà en cours."
      )
    );
  });

  it("signale une erreur réseau si le serveur est injoignable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Failed to fetch")
    );

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringMatching(/Erreur réseau/)
      )
    );
  });

  it("confirme une impression réussie par un toast de succès", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, { status: "sent", quantity: 2 })
    );

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
  });

  it("envoie le format de papier mémorisé dans le réglage", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { status: "sent", quantity: 2 }));

    document.cookie = `${PRINT_SETTINGS_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify({ paperId: "100x50" })
    )}; path=/`;

    const { codeInput, quantityInput, submitButton } = renderForm();
    fireEvent.change(codeInput, { target: { value: VALID_BODY.ean13 } });
    fireEvent.change(quantityInput, { target: { value: "2" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/print/ean13",
        expect.objectContaining({
          body: JSON.stringify({
            ean13: VALID_BODY.ean13,
            quantity: 2,
            paperId: "100x50",
          }),
        })
      )
    );
  });
});