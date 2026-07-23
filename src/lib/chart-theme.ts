import type { CSSProperties } from "react";

/** Shared chart styles for the light GymmerzHub theme */
export const chartTooltipStyle: CSSProperties = {
  backgroundColor: "oklch(1 0 0)",
  border: "1px solid oklch(0.9 0.01 255)",
  borderRadius: 10,
  color: "oklch(0.24 0.02 260)",
  fontSize: 12,
  boxShadow: "0 8px 24px -8px rgba(15, 23, 42, 0.15)",
};

export const chartGrid = "oklch(0.9 0.01 255)";
export const chartCursor = "oklch(0.55 0.19 255 / 6%)";
export const chartAxis = "#94a3b8";

export const chartColors = {
  primary: "oklch(0.55 0.19 255)",
  secondary: "oklch(0.6 0.12 195)",
  muted: "oklch(0.78 0.02 255)",
  warning: "oklch(0.75 0.14 75)",
  danger: "oklch(0.58 0.22 25)",
  teal: "oklch(0.62 0.11 200)",
  slate: "oklch(0.55 0.04 260)",
  sky: "oklch(0.7 0.1 230)",
};

export const pieColors = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.teal,
  chartColors.sky,
  chartColors.warning,
  chartColors.muted,
];
