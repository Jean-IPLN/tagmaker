import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SkeletonForm } from "@/components/skeleton-form";

describe("SkeletonForm", () => {
  it("expose un statut accessible pour le chargement", () => {
    render(<SkeletonForm />);

    expect(
      screen.getByRole("status", { name: "Chargement du formulaire…" })
    ).toBeInTheDocument();
  });

  it("déclare la silhouette d'un formulaire par des squelettes", () => {
    const { container } = render(<SkeletonForm />);

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("reste neutre pour les lecteurs d'écran (éléments décoratifs)", () => {
    render(<SkeletonForm />);

    const status = screen.getByRole("status", { name: "Chargement du formulaire…" });
    expect(within(status).queryByRole("heading")).not.toBeInTheDocument();
  });
});