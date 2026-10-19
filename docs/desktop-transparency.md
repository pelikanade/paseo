# Desktop transparency

This fork carries a downstream feature: on Linux, the Electron window is transparent and the renderer paints a single translucent glass tint over the compositor's blurred wallpaper. Cards, tabs, pills, buttons, popovers and menus use low-alpha overlays instead of opaque surfaces, so they keep a visible base colour while the wallpaper shows through.

It is not an upstream feature. When you sync upstream, expect this feature's files to conflict as a set. Resolve by the layer model and the token roles below, not by line numbers.

## How the layer works

1. The Electron main process creates the Linux window with `transparent: true` and `backgroundColor: "rgba(0, 0, 0, 0)"` (`packages/desktop/src/main.ts`).
2. The renderer's chrome sync sends an opaque theme colour to the main process. `window-manager.ts` ignores that colour on Linux, because applying it paints over the transparent surface again.
3. The renderer paints **one** tint at the root: `windowFill` uses `theme.colors.surfaceGlass`, which is `rgba(24, 27, 26, 0.85)` for the default dark theme (`packages/app/src/app/_layout.tsx`). Every structural surface below it is transparent. A second translucent layer multiplies the alpha towards opaque.
4. React Navigation normally paints each screen with an opaque background. `_layout.tsx` wraps the app in a `ThemeProvider` with a transparent background, and `ThemedStack` passes `backgroundColor: "transparent"` (`packages/app/src/navigation/themed-stack.tsx`).
5. Cards, row states, tabs, pills and popovers use low-alpha overlays on top of the glass. The result is a visible base tint with the wallpaper still visible through it.
6. Popovers float over the app, not over the desktop, so the compositor cannot blur what is behind them. Web builds use `backdrop-filter: blur(20px)` through `glassBackdropFilter` (`packages/app/src/styles/theme.ts`), and `index.html` also applies it to `[data-menu-surface="true"]`. Native builds keep the translucent fill without the CSS blur.

Light themes stay visually opaque: `surfaceGlass` is the theme's opaque `surface0`, matching MonoCode's dark-only glass behaviour. The window is still transparent at the Electron level, but the renderer covers it.

Non-Linux Electron targets are untouched by the window options. The renderer glass tokens fall back to opaque colours where `GLASS_ENABLED` is false. `GLASS_ENABLED` is true only when the app runs inside the desktop host on Linux; browser web on Linux stays opaque.

## Renderer tokens

Defined in `packages/app/src/styles/theme.ts`, built by `buildLightSemanticColors` and `buildDarkSemanticColors`.

| Token                | Dark glass (Electron/Linux) | Light theme                | Dark non-glass    |
| -------------------- | --------------------------- | -------------------------- | ----------------- |
| `surfaceGlass`       | `rgba(surface0, 0.85)`      | opaque `surface0`          | opaque `surface0` |
| `surfaceCard`        | `rgba(255, 255, 255, 0.06)` | `rgba(0, 0, 0, 0.035)`     | opaque `surface1` |
| `surfaceRowHover`    | `rgba(255, 255, 255, 0.04)` | `rgba(0, 0, 0, 0.035)`     | opaque `surface1` |
| `surfaceRowSelected` | `rgba(255, 255, 255, 0.07)` | `rgba(0, 0, 0, 0.06)`      | opaque `surface2` |
| `surfaceRowPressed`  | `rgba(255, 255, 255, 0.09)` | `rgba(0, 0, 0, 0.09)`      | opaque `surface2` |
| `surfaceCode`        | `rgba(255, 255, 255, 0.07)` | `rgba(0, 0, 0, 0.045)`     | opaque `surface2` |
| `surfaceMenu`        | `rgba(surface1, 0.55)`      | `rgba(255, 255, 255, 0.9)` | opaque `surface1` |
| `borderGlass`        | `rgba(255, 255, 255, 0.06)` | `rgba(0, 0, 0, 0.08)`      | opaque `border`   |

`surfaceSidebar` and `surfaceWorkspace` become `transparent` in dark glass mode. `glassBackdropFilter` is the web-only blur object used by menus, dropdowns and hover cards. `packages/app/react-native-web.d.ts` declares the two CSS properties for TypeScript.

Tune the effect in `theme.ts`. `GLASS_ALPHA` controls the root tint; the `surface*` entries control cards, rows and popovers. If a surface looks too opaque, lower its alpha rather than adding a second tint layer.

## Where the feature lives

Organised by intent, not by file count:

- **Window and chrome**: `packages/desktop/src/main.ts`, `packages/desktop/src/window/window-manager.ts`.
- **Borders and dividers**: rendered borders, one-pixel dividers and markdown rules use `borderGlass`, not the opaque `border` colour. `border` remains only for non-border semantics such as the inactive status dot and disabled glyph; `borderAccent` stays for focus and selection.
- **Root and navigation**: `packages/app/public/index.html`, `packages/app/react-native-web.d.ts`, `packages/app/src/app/_layout.tsx`, `packages/app/src/navigation/themed-stack.tsx`.
- **Structural surfaces**: workspace, tabs, headers, sidebar, splits, screen roots, splash and error screens, setup/plugin screens, `page-layout`.
- **Rows and selection**: agent list, sidebar workspace/status renderers, explorer tree, settings sidebar, collapsible rows, segmented controls. Tab chips use the hover overlay for both hover and active; the label colour carries the active state, so the chip never becomes a solid plate. Trailing action scrims were removed: the kebab and tab close button overlay their content without a gradient plate behind them.
- **Cards and pills**: composer input, composer pills, `DiffStat` pill, thinking/tool-call expansion, settings cards, open-project tiles.
- **Popovers**: shared menu surface and menu items, combobox, autocomplete, select/button hovers, hover cards. Context menus and plugin popovers use the shared `MenuSurface`, so they are covered by the same change.
- **Diff views**: file header, diff header/context lines, tool-call diff and scroll areas, diff-pane callouts.
- **Markdown and code**: inline code, fenced code, tables, blockquotes, details summaries, code surfaces, front matter cells, startup logs. Markdown style roles are in `packages/app/src/components/markdown/styles.ts`; the renderer itself only consumes them.
- **Floating UI**: toasts, download progress, pane find, command center, workspace/plugin hover cards, zoom controls, dialogs and sheets.
- **Plugin pages**: `toPluginGlassTheme` (`packages/app/src/plugins/theme.ts`) hands plugin settings, surfaces and workspace panels a transparent `surface0` and translucent `surface1/2`. Plugin buttons, sidebar items and timeline UI keep the regular theme.
- **Workspace gate**: the loading/unavailable/recovery shell uses `containerWorkspaceBackground`, not the opaque `container`, so a newly created or temporarily unavailable workspace stays glass.
- **New agent drafts**: `packages/app/src/composer/draft/workspace-tab.tsx` paints its own root. It is transparent like the rest of the pane, so an empty draft stays glass until the first message.

## Choosing a token for a surface

When a card, tab or popover reads as a flat plate, do not change `surface0` or `surface1`. Pick by role:

- a card or panel -> `surfaceCard`
- a code block, inline code, log, or diff context -> `surfaceCode`
- a hovered row, tab, or button -> `surfaceRowHover`
- a selected row or active tab -> `surfaceRowSelected`
- a pressed row -> `surfaceRowPressed`
- a popover, dropdown, context menu, or plugin popover -> `surfaceMenu` plus `glassBackdropFilter`

A structural container that spans a whole region becomes transparent and lets the root glass layer show through. A popover needs `surfaceMenu` and the web backdrop blur because the compositor cannot blur app content behind it.

## Surfaces intentionally left opaque

Not every `surface*` background is a plate. These stay opaque on purpose:

- Terminal emulator body, browser webview, and file editor body: reading and terminal contrast win over wallpaper bleed.
- Skeleton placeholders (`sidebar-agent-list-skeleton`, PR/commit skeletons).
- Status-ring and sidebar status backdrops used to knock holes out of icons; they must match an opaque paint to cut the icon cleanly.
- Small badges, shortcut chips, usage meters, and diff add/remove tints: their colour is the signal, and they are already translucent where appropriate.
- Modal scrims and image/video previews, where dimming is the point.

If one of these reads as a plate in the live UI, convert it with the role table rather than making `surface0` translucent.

## Updating after an upstream sync

The feature is one commit on this fork. Merge or rebase upstream normally, then treat every conflict in that commit as part of the same design.

1. Re-apply the token definitions in `theme.ts` first. Upstream may add themes or change the semantic-colour helpers; the glass entries belong in both `buildLightSemanticColors` and `buildDarkSemanticColors`, and `GLASS_ENABLED` / `GLASS_ALPHA` / `withAlpha` belong at the top of the file.
2. Re-check the four structural pieces: the transparent window options, the Linux guard around `setBackgroundColor`, the root `windowFill` tint plus transparent navigation theme, and the transparent `html`/`body` plus menu-surface blur in `index.html`.
3. Let typecheck find moved `surface*` call sites, then audit what it cannot see:

   ```bash
   rg -n "backgroundColor: theme\.colors\.(surface[0-3]|surfaceSidebar|surfaceWorkspace)" packages/app/src
   rg -n "border(Color|BottomColor|TopColor|LeftColor|RightColor): theme\.colors\.border\b" packages/app/src
   ```

   Hits in the intentionally-opaque list or on non-glass fallbacks are fine. Every other hit should use a glass token or be transparent.

4. Audit the desktop main process:

   ```bash
   rg -n "transparent: true|setBackgroundColor|rgba\(0, 0, 0, 0\)" packages/desktop/src
   ```

   The Linux window must stay transparent and `setBackgroundColor` must stay guarded.

5. Upstream moves styles between files. Re-apply intent to the new owner rather than restoring deleted files. Markdown styles, for example, moved from `styles/markdown-styles.ts` into `components/markdown/styles.ts` between 0.11 and 0.12.
6. Run the checks under [Verification](#verification), then verify both themes in a live Hyprland session.

## Verification

- `npm run typecheck` and `npm run lint`.
- Focused unit tests from `packages/app`:
  `npx vitest run src/styles/theme.test.ts src/plugins/theme.test.ts src/components/markdown/renderer.test.ts --bail=1`
- `npm run build:main --workspace=@getpaseo/desktop` covers the main-process change.
- `npm run dev:desktop` on Hyprland. In dark mode, check the root glass and wallpaper blur; composer, sidebar selection, tabs, pills, thinking/tool blocks, settings cards, diff panel, context menus, dropdowns and plugin popovers should read as tinted glass, not flat plates. Toggle light mode: it should remain opaque and readable.
- For a packaged build, `nix build .#paseo-desktop`, then extract the main process and confirm `transparent: true`, `rgba(0, 0, 0, 0)` and the Linux guard around `setBackgroundColor`:
  `asar extract-file .../app.asar dist/main.js`.
- Optional renderer pixel check: load the exported web renderer in a headless browser with a `window.paseoDesktop` stub whose platform is `linux`. The computed root background should be `rgba(24, 27, 26, 0.85)`, the navigation background should not be `rgb(242, 242, 242)`, and a corner pixel over white should be about `rgb(58, 61, 60)`.

## Pitfalls

- **Do not make `surface0` translucent.** It is also used as a text/icon colour and in string concatenations such as `${surface0}cc`; changing the token breaks both. Add or use the dedicated glass tokens instead.
- **One paint layer per region.** Two 85% layers reach roughly 98% opacity. Keep section containers transparent and paint the tint once at the root (`windowFill`) or once per floating surface.
- **Keep `html` and `body` transparent.** The original dark `background-color: #181b1a` sits behind the glass and makes it opaque.
- **Keep the navigation theme background transparent.** Otherwise every screen paints an opaque layer over the glass.
- **Menus need their own blur.** The compositor only blurs the desktop behind the window. Use `surfaceMenu` plus `backdrop-filter` (web) so app content behind a popover is blurred rather than sharp; do not lower the menu alpha without that blur.
- **Linux-only window changes.** Transparent windows on other platforms have different resize and shadow limitations. Keep the `process.platform === "linux"` guards if the code is reused elsewhere.
- **Hyprland must blur.** `decoration.blur.enabled` is set in the flake repository. Without compositor blur the glass shows the raw wallpaper.
- **Do not reintroduce trailing-action scrims.** A gradient painted over a glass row reads as a solid plate, even when its colour is translucent. The kebab and tab close button overlay their content directly; reserve layout space if overlap becomes a problem.
- **Do not edit the built `app.asar`.** Change the source and rebuild; the deployed Nix store output is immutable.
