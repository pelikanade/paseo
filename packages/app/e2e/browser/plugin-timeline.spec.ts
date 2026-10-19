import { expect } from "@playwright/test";
import { test } from "../support/fixtures";
import {
  withTimelinePlugin,
  viewInlineThinkingExample,
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
    expect(rects.pluginRows).toHaveLength(4);

    // The assistant boundary uses the native 4px gap.
    expect(rects.pluginRows[0]!.top - rects.assistantBottoms.at(-1)!).toBeCloseTo(4, 0);
    // Consecutive flagged rows touch like native tool rows: 4px, not 16px.
    expect(rects.pluginRows[1]!.top - rects.pluginRows[0]!.bottom).toBeCloseTo(4, 0);
    // The flagged row ends the tool sequence (16px last-row margin); the generic plugin row
    // below it keeps the default 16px gap.
    expect(rects.pluginRows[2]!.top - rects.pluginRows[1]!.bottom).toBeCloseTo(32, 0);
    expect(rects.pluginRows[3]!.top - rects.pluginRows[2]!.bottom).toBeCloseTo(16, 0);
    // Last flagged row: 16px row margin plus the footer's normal 13px margin.
    expect(rects.footerTop! - rects.pluginRows[3]!.bottom).toBeCloseTo(29, 0);
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

test("inline-thinking example renders a streamed thought through host UI", async ({
  page,
}, info) => {
  await viewInlineThinkingExample(page, info);
});
