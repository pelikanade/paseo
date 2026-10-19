import { expect } from "@playwright/test";
import { test } from "../support/fixtures";
import {
  withTimelinePlugin,
  withAppendTimelinePlugin,
  readTimelineRowRects,
  requestPluginTimeline,
  interactWithStreamingCard,
  expectWholeCompletedCard,
  expectBothConsecutiveTools,
} from "../support/helpers/plugin-timeline";

for (const width of [1100, 390]) {
  test(`assistant plugin receives the whole streaming message at width ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await withTimelinePlugin(page, info, "assistant", async (agent) => {
      await requestPluginTimeline(agent);
      await interactWithStreamingCard(page);
      await agent.client.waitForFinish(agent.agentId, 30_000);
      await expectWholeCompletedCard(page);
      // Local state is checked during growth; the viewport remounts on the history handoff.
      await page.reload({ waitUntil: "domcontentloaded" });
      await expectWholeCompletedCard(page);
    });
  });
}

test("appended plugin rows follow the tool sequence and footer rhythm", async ({ page }, info) => {
  await withAppendTimelinePlugin(page, info, async (agent) => {
    await requestPluginTimeline(agent);
    await agent.client.waitForFinish(agent.agentId, 30_000);

    // Two flagged rows, then a plain row, then a last flagged row.
    const rows = page.getByTestId("plugin-tool-row");
    await expect(rows).toHaveCount(4, { timeout: 30_000 });
    await expect(page.getByTestId("assistant-message").last()).toBeVisible({ timeout: 30_000 });

    const rects = await readTimelineRowRects(page);
    expect(rects.footerTop).not.toBeNull();
    expect(rects.footerMarginTop).not.toBeNull();
    expect(rects.pluginRows).toHaveLength(4);
    // The mock turn emits read and grep as consecutive native tool rows; use them as the baseline
    // instead of hardcoding the plugin margins.
    expect(rects.nativeToolRows.length).toBeGreaterThanOrEqual(2);

    const nativeRows = rects.nativeToolRows;
    const nativeHeight = nativeRows[0]!.bottom - nativeRows[0]!.top;
    const nativeGap = nativeRows[1]!.top - nativeRows[0]!.bottom;
    const nativePitch = nativeRows[1]!.top - nativeRows[0]!.top;
    const nativeTrailingGap = rects.assistantTops.at(-1)! - nativeRows.at(-1)!.bottom;

    // Flagged rows have the native row height and the native zero gap between consecutive tools.
    expect(rects.pluginRows[0]!.bottom - rects.pluginRows[0]!.top).toBeCloseTo(nativeHeight, 0);
    expect(rects.pluginRows[1]!.top - rects.pluginRows[0]!.bottom).toBeCloseTo(nativeGap, 0);
    expect(rects.pluginRows[1]!.top - rects.pluginRows[0]!.top).toBeCloseTo(nativePitch, 0);

    // The assistant boundary uses the native trailing-tool gap.
    expect(rects.pluginRows[0]!.top - rects.assistantBottoms.at(-1)!).toBeCloseTo(
      nativeTrailingGap,
      0,
    );

    // The generic plugin row keeps the same default gap on both sides.
    expect(rects.pluginRows[2]!.top - rects.pluginRows[1]!.bottom).toBeCloseTo(
      rects.pluginRows[3]!.top - rects.pluginRows[2]!.bottom,
      0,
    );

    // The last flagged row adds no margin of its own; only the footer margin separates them.
    expect(rects.footerTop! - rects.pluginRows[3]!.bottom).toBeCloseTo(rects.footerMarginTop!, 0);
  });
});

test("Overview preserves both consecutive tool plugin cards", async ({ page }, info) => {
  await withTimelinePlugin(page, info, "tools", async (agent) => {
    await requestPluginTimeline(agent);
    await agent.client.waitForFinish(agent.agentId, 30_000);
    await expectBothConsecutiveTools(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectBothConsecutiveTools(page);
  });
});
