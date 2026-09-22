import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RECENT_COOKIE_NAME, readRecentCookie } from "@/lib/recent-modules-cookie";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { RecentModulesTracker } from "@/components/recent-modules-tracker";

describe("RecentModulesTracker", () => {
  beforeEach(() => {
    document.cookie = "tagmaker_recent_modules=; Max-Age=0";
    mockPathname = "/";
  });

  it("enregistre un module lors de sa consultation (/ean13)", () => {
    mockPathname = "/ean13";

    render(<RecentModulesTracker />);

    const entries = readRecentCookie();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].moduleId).toBe("ean13");
  });

  it("n'écrit rien sur une route qui n'est pas un module (/)", () => {
    render(<RecentModulesTracker />);

    expect(document.cookie).not.toContain(`${RECENT_COOKIE_NAME}=`);
  });

  it("ne produit aucun rendu visible", () => {
    mockPathname = "/ean13";

    const { container } = render(<RecentModulesTracker />);

    expect(container).toBeEmptyDOMElement();
  });
});