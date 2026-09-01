/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, within } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CddaData } from "../data";
import Mod from "./Mod.svelte";

afterEach(cleanup);

const data = new CddaData(
  [],
  undefined,
  undefined,
  {
    test_mod: {
      id: "test_mod",
      name: "Test Mod",
      description: "A test mod.",
      category: "content",
    },
    other_mod: {
      id: "other_mod",
      name: "Other Mod",
      description: "Another mod.",
      category: "total_conversion",
    },
  },
  {
    test_mod: {
      info: {
        type: "MOD_INFO",
        id: "test_mod",
        name: "Test Mod",
        authors: ["Test Author"],
        maintainers: ["Test Maintainer"],
        conflicts: ["other_mod", "missing_mod"],
      },
      data: [{ type: "GENERIC", id: "test_item", name: "Test item" }],
    },
    other_mod: {
      info: { name: "Other Mod" },
      data: [{ type: "MONSTER", id: "test_monster", name: "Test monster" }],
    },
  },
);

const enabledData = new CddaData(
  [],
  undefined,
  undefined,
  {
    test_mod: {
      id: "test_mod",
      name: "Test Mod",
      description: "A test mod.",
      category: "content",
    },
    other_mod: {
      id: "other_mod",
      name: "Other Mod",
      description: "Another mod.",
      category: "total_conversion",
    },
  },
  {
    test_mod: {
      info: {
        type: "MOD_INFO",
        id: "test_mod",
        name: "Test Mod",
        authors: ["Test Author"],
        maintainers: ["Test Maintainer"],
        conflicts: ["other_mod", "missing_mod"],
      },
      data: [{ type: "GENERIC", id: "test_item", name: "Test item" }],
    },
    other_mod: {
      info: { name: "Other Mod" },
      data: [
        {
          type: "MONSTER",
          id: "other_monster",
          name: "Other monster",
          symbol: "O",
        },
      ],
    },
  },
  ["test_mod", "other_mod"],
);

describe("Mod", () => {
  it("renders only the requested mod on a mod page", async () => {
    const setModEnabled = vi.fn();
    const { getByRole, getByText, queryByText } = render(Mod, {
      data,
      enabledMods: [],
      setModEnabled,
      modId: "test_mod",
    });

    expect(getByText("Test Mod")).toBeTruthy();
    expect(getByText("A test mod.")).toBeTruthy();
    const enabledLabel = getByText("Enabled");
    const enabledCheckbox = getByRole("checkbox", { name: "Enabled" });
    expect(enabledLabel.tagName).toBe("LABEL");
    expect(enabledLabel.getAttribute("for")).toBe(enabledCheckbox.id);
    expect(enabledCheckbox.closest("label.checkbox")).toBeTruthy();
    await fireEvent.click(enabledLabel);
    expect(setModEnabled).toHaveBeenCalledWith("test_mod", true);
    expect(getByText("Items")).toBeTruthy();
    expect(getByText("1")).toBeTruthy();
    expect(
      Array.from(
        document.querySelectorAll("section dl dt"),
        (term) => term.textContent,
      ),
    ).toEqual(["Enabled", "Authors", "Maintainers", "Conflicts", "Items"]);
    expect(getByText("Test Author")).toBeTruthy();
    expect(getByText("Test Maintainer")).toBeTruthy();
    expect(getByRole("link", { name: "Other Mod" }).getAttribute("href")).toBe(
      "/mod/other_mod",
    );
    expect(document.querySelector("section dl")?.textContent).not.toContain(
      "missing_mod",
    );
    expect(queryByText("Other Mod", { selector: "h1" })).toBeNull();
    const rawJson = getByText("Raw JSON").closest("details");
    expect(rawJson?.textContent).toContain('"type": "MOD_INFO"');
    expect(rawJson?.parentElement?.lastElementChild).toBe(rawJson);
  });

  it("renders each non-empty catalog inline when the mod is enabled", () => {
    const { getByRole, getByText } = render(Mod, {
      data: enabledData,
      enabledMods: ["test_mod"],
      setModEnabled: vi.fn(),
      modId: "test_mod",
    });

    expect(getByRole("heading", { name: "Items" }).closest("section")).toBe(
      getByText("Test item").closest("section"),
    );
    expect(getByText("Test item").getAttribute("href")).toBe("/item/test_item");
  });

  it("blocks enabling a mod when it declares a conflict with an enabled mod", () => {
    const { getByText, getByRole, queryByRole } = render(Mod, {
      data,
      enabledMods: ["other_mod"],
      setModEnabled: vi.fn(),
      modId: "test_mod",
    });

    expect(queryByRole("checkbox")).toBeNull();
    const enabledValue = getByText("Conflicts with").closest("dd")!;
    expect(
      within(enabledValue)
        .getByRole("link", { name: "Other Mod" })
        .getAttribute("href"),
    ).toBe("/mod/other_mod");
  });

  it("blocks enabling a mod when an enabled mod declares the conflict", () => {
    const { getByText, getByRole, queryByRole } = render(Mod, {
      data,
      enabledMods: ["test_mod"],
      setModEnabled: vi.fn(),
      modId: "other_mod",
    });

    expect(queryByRole("checkbox")).toBeNull();
    const enabledValue = getByText("Conflicts with").closest("dd")!;
    expect(
      within(enabledValue)
        .getByRole("link", { name: "Test Mod" })
        .getAttribute("href"),
    ).toBe("/mod/test_mod");
  });

  it("replaces inline catalogs when navigating between mod pages", async () => {
    const props = {
      data: enabledData,
      enabledMods: ["test_mod", "other_mod"],
      setModEnabled: vi.fn(),
    };
    const { getByText, queryByText, rerender } = render(Mod, {
      ...props,
      modId: "test_mod",
    });

    expect(getByText("Test item")).toBeTruthy();
    await rerender({ ...props, modId: "other_mod" });

    expect(queryByText("Test item")).toBeNull();
    expect(getByText("Other monster")).toBeTruthy();
  });
});
