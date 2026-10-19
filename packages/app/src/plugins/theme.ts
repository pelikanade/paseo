import type { PluginTheme } from "@getpaseo/plugin";
import type { Theme } from "@/styles/theme";

export function toPluginTheme(theme: Theme): PluginTheme {
  return {
    colors: {
      surface0: theme.colors.surface0,
      surface1: theme.colors.surface1,
      surface2: theme.colors.surface2,
      border: theme.colors.borderGlass,
      foreground: theme.colors.foreground,
      foregroundMuted: theme.colors.foregroundMuted,
      accent: theme.colors.accent,
      accentForeground: theme.colors.accentForeground,
      statusSuccess: theme.colors.statusSuccess,
      statusWarning: theme.colors.statusWarning,
      statusDanger: theme.colors.statusDanger,
    },
  };
}

/**
 * Plugin surfaces paint their own roots from `surface0`. Hand them the glass
 * roles instead of the opaque palette so a plugin page does not become a plate
 * inside the transparent window.
 */
export function toPluginGlassTheme(theme: Theme): PluginTheme {
  return {
    colors: {
      ...toPluginTheme(theme).colors,
      surface0: "transparent",
      surface1: theme.colors.surfaceCard,
      surface2: theme.colors.surfaceRowHover,
    },
  };
}
