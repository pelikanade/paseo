import type { SurfaceBackdrop } from "@/styles/surface-backdrop";

/** The surface a tab rail paints: a pane header or the Explorer sidebar. */
export type WorkspaceTabRailSurface = "surface" | "sidebar";

/**
 * The fill of a tab chip, named as the surface token it paints so the chip style and everything
 * knocking out of it (the running-status ring) agree.
 *
 * Either rail fills a chip with the translucent row token rather than climbing its own ladder of
 * opaque surface steps: the rails are transparent on Linux, and an opaque tile inside a clear rail
 * reads as a block of the wrong colour. The resting token is the rail's own surface, because a chip
 * with no fill still has to name what is behind it.
 */
export function resolveWorkspaceTabChipBackdrop({
  rail,
  isActiveFocused,
  isFilled,
}: {
  rail: WorkspaceTabRailSurface;
  isActiveFocused: boolean;
  isFilled: boolean;
}): SurfaceBackdrop {
  if (isActiveFocused || isFilled) return "surfaceRowHover";
  return rail === "sidebar" ? "surfaceSidebar" : "surface0";
}
