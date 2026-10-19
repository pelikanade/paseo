import { describe, expect, it } from "vitest";
import { getSidebarRowBackdrop } from "./sidebar-row-backdrop";

describe("getSidebarRowBackdrop", () => {
  it("keeps selected rows on the selected surface while hovered", () => {
    expect(getSidebarRowBackdrop({ selected: true, isHovered: true })).toBe("surfaceRowSelected");
  });

  it("uses the hover surface for an unselected hovered row", () => {
    expect(getSidebarRowBackdrop({ isHovered: true })).toBe("surfaceRowHover");
  });

  it("uses the pressed surface for a pressed row and the opaque surface while dragging", () => {
    expect(getSidebarRowBackdrop({ isPressed: true })).toBe("surfaceRowPressed");
    expect(getSidebarRowBackdrop({ isDragging: true })).toBe("surface2");
  });
});
