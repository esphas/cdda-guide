/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CddaData } from "./data";
import ModCatalog from "./ModCatalog.svelte";

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
    },
    other_mod: {
      id: "other_mod",
      name: "Other Mod",
      description: "Another mod.",
    },
  },
  {
    test_mod: {
      info: { name: "Test Mod" },
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
    },
    other_mod: {
      id: "other_mod",
      name: "Other Mod",
      description: "Another mod.",
    },
  },
  {
    test_mod: {
      info: { name: "Test Mod" },
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

describe("ModCatalog", () => {
  it("links mod names in the index to their mod pages", () => {
    const { getByRole, queryByText } = render(ModCatalog, {
      data,
      enabledMods: [],
      setModEnabled: vi.fn(),
    });

    const link = getByRole("link", { name: "Test Mod" });
    expect(link.getAttribute("href")).toBe("/mod/test_mod");
    expect(queryByText("A test mod.")).toBeNull();
    expect(queryByText("Items")).toBeNull();
    expect(document.querySelector("input[type=checkbox]")).toBeNull();
    expect(link.closest("section")).toBeTruthy();
  });

  it("renders only the requested mod on a mod page", async () => {
    const setModEnabled = vi.fn();
    const { getByRole, getByText, queryByText } = render(ModCatalog, {
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
    expect(queryByText("Other Mod")).toBeNull();
  });

  it("renders each non-empty catalog inline when the mod is enabled", () => {
    const { getByRole, getByText } = render(ModCatalog, {
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

  it("replaces inline catalogs when navigating between mod pages", async () => {
    const props = {
      data: enabledData,
      enabledMods: ["test_mod", "other_mod"],
      setModEnabled: vi.fn(),
    };
    const { getByText, queryByText, rerender } = render(ModCatalog, {
      ...props,
      modId: "test_mod",
    });

    expect(getByText("Test item")).toBeTruthy();
    await rerender({ ...props, modId: "other_mod" });

    expect(queryByText("Test item")).toBeNull();
    expect(getByText("Other monster")).toBeTruthy();
  });
});
