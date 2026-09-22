import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecentModulesGallery } from "@/components/recent-modules-gallery";

describe("RecentModulesGallery", () => {
  it("affiche le squelette quand la liste des modules est vide", () => {
    render(<RecentModulesGallery moduleIds={[]} />);

    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText("EAN-13")).toBeNull();
  });

  it("affiche une carte par module du plus récent au plus ancien", () => {
    render(<RecentModulesGallery moduleIds={["ean13"]} />);

    const card = screen.getByRole("link", { name: /EAN-13/ });
    expect(card).toHaveAttribute("href", "/ean13");
    expect(screen.getByText("Imprimer des étiquettes à code-barres EAN-13")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });
});