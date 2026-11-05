import type { Theme } from "@mariozechner/pi-coding-agent";
import type { PierreAppearance } from "../types.js";

export interface PierreTerminalPalette {
  appearance: PierreAppearance;
  editorBg: string;
  titleBg: string;
  titleFg: string;
  titleAccentFg: string;
  contextFg: string;
  contextRowBg: string;
  additionFg: string;
  additionRowBg: string;
  deletionFg: string;
  deletionRowBg: string;
  lineNumberFg: string;
  metadataFg: string;
  metadataBg: string;
  pendingFg: string;
  pendingBg: string;
  successFg: string;
  successBg: string;
  errorFg: string;
  errorBg: string;
}

export function getPierreAppearance(theme: Theme): PierreAppearance {
  return theme.name?.toLowerCase().includes("light") ? "light" : "dark";
}

export function getPierrePalette(theme: Theme): PierreTerminalPalette {
  return buildPalette(getPierreAppearance(theme), theme.colors as unknown as Record<string, string>);
}

function buildPalette(appearance: PierreAppearance, colors: Record<string, string>): PierreTerminalPalette {
  const editorBg = colors.toolPendingBg ?? fallback(appearance, "#070707", "#ffffff");
  const additionFg = colors.success ?? fallback(appearance, "#00cab1", "#008f7a");
  const deletionFg = colors.error ?? fallback(appearance, "#ff2e3f", "#c62828");
  const additionRowBg = colors.toolSuccessBg ?? fallback(appearance, "#0c1f1d", "#e6fbf8");
  const deletionRowBg = colors.toolErrorBg ?? fallback(appearance, "#261214", "#ffe9eb");
  return {
    appearance,
    editorBg,
    titleBg: colors.toolPendingBg ?? editorBg,
    titleFg: colors.toolTitle ?? colors.text ?? fallback(appearance, "#fbfbfb", "#070707"),
    titleAccentFg: colors.accent ?? colors.toolTitle ?? fallback(appearance, "#009fff", "#0062cc"),
    contextFg: colors.muted ?? colors.text ?? fallback(appearance, "#adadb1", "#6C6C71"),
    contextRowBg: editorBg,
    additionFg,
    additionRowBg,
    deletionFg,
    deletionRowBg,
    lineNumberFg: colors.dim ?? colors.muted ?? fallback(appearance, "#84848A", "#909095"),
    metadataFg: colors.dim ?? colors.muted ?? fallback(appearance, "#84848A", "#909095"),
    metadataBg: editorBg,
    pendingFg: colors.accent ?? colors.text ?? fallback(appearance, "#009fff", "#0062cc"),
    pendingBg: editorBg,
    successFg: additionFg,
    successBg: additionRowBg,
    errorFg: deletionFg,
    errorBg: deletionRowBg,
  };
}

function fallback(appearance: PierreAppearance, dark: string, light: string) {
  return appearance === "dark" ? dark : light;
}
