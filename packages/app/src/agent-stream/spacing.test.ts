import { describe, expect, it } from "vitest";
import { getAssistantMessageSpacing, getGapBetweenStreamItems } from "./spacing";
import type { StreamItem } from "@/types/stream";
import { SPACING } from "@/styles/theme";

const message: StreamItem = {
  kind: "assistant_message",
  id: "m",
  text: "First\n\nSecond",
  timestamp: new Date(0),
};

const user: StreamItem = {
  kind: "user_message",
  id: "u",
  text: "Prompt",
  timestamp: new Date(0),
};

function thought(id: string): StreamItem {
  return { kind: "thought", id, text: id, status: "ready", timestamp: new Date(0) };
}

function todo(id: string): StreamItem {
  return {
    kind: "todo_list",
    id,
    provider: "claude",
    items: [],
    activity: { type: "created", count: 0 },
    timestamp: new Date(0),
  };
}

function plugin(id: string, sequence?: "tool"): StreamItem {
  return {
    kind: "plugin",
    id,
    pluginId: "test",
    pluginItemId: id,
    itemKind: "intent",
    version: 1,
    ...(sequence ? { sequence } : {}),
    data: {},
    timestamp: new Date(0),
  };
}

describe("whole-message spacing", () => {
  it("compacts only the gap to its turn footer", () => {
    expect(getAssistantMessageSpacing({ item: message })).toBe("default");
    expect(getAssistantMessageSpacing({ item: message, hasFooterBelow: true })).toBe(
      "compactBottom",
    );
  });

  it("keeps separate messages separated", () => {
    expect(getGapBetweenStreamItems(message, { ...message, id: "next" })).toBeGreaterThan(0);
  });
});

describe("tool sequence spacing", () => {
  it.each(["thought", "todo_list"] as const)(
    "joins a flagged plugin row to a %s row in both directions",
    (kind) => {
      const row = kind === "thought" ? thought("row") : todo("row");
      const flagged = plugin("plugin", "tool");
      expect(getGapBetweenStreamItems(flagged, row)).toBe(0);
      expect(getGapBetweenStreamItems(row, flagged)).toBe(0);
    },
  );

  it("uses the native gap around an assistant message", () => {
    const flagged = plugin("plugin", "tool");
    expect(getGapBetweenStreamItems(flagged, message)).toBe(SPACING[1]);
    expect(getGapBetweenStreamItems(message, flagged)).toBe(SPACING[1]);
  });

  it("uses the native gap below a user message", () => {
    expect(getGapBetweenStreamItems(user, plugin("plugin", "tool"))).toBe(SPACING[4]);
  });

  it("leaves the normal footer margin when the flagged row is last", () => {
    expect(getGapBetweenStreamItems(plugin("plugin", "tool"), null)).toBe(0);
  });

  it("keeps generic plugin rows out of the tool sequence", () => {
    expect(getGapBetweenStreamItems(plugin("plugin"), thought("row"))).toBe(SPACING[4]);
    expect(getGapBetweenStreamItems(thought("row"), plugin("plugin"))).toBe(SPACING[4]);
    expect(getGapBetweenStreamItems(plugin("plugin"), plugin("flagged", "tool"))).toBe(SPACING[4]);
  });
});
