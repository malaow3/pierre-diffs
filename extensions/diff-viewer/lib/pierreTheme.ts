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
  return buildPalette(getPierreAppearance(theme), normalizeThemeColors((theme as { colors?: unknown }).colors));
}

/**
 * Pi's `Theme.colors` returns pi-tui `Color` objects (`{ kind: "rgb" | "indexed" | "oklch", ... }`) in
 * newer versions and plain strings in older ones. Normalize everything to `#rrggbb` hex strings.
 */
function normalizeThemeColors(raw: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!raw || typeof raw !== "object") {
    return result;
  }

  for (const [token, value] of Object.entries(raw as Record<string, unknown>)) {
    const hex = colorValueToHex(value);
    if (hex) {
      result[token] = hex;
    }
  }
  return result;
}

function colorValueToHex(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
    if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    return undefined;
  }
  if (typeof value === "number") {
    return indexedToHex(value);
  }
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const color = value as { kind?: string; r?: number; g?: number; b?: number; index?: number; l?: number; c?: number; h?: number };
  if (color.kind === "rgb" && isFiniteNumber(color.r) && isFiniteNumber(color.g) && isFiniteNumber(color.b)) {
    return rgbToHex(color.r, color.g, color.b);
  }
  if (color.kind === "indexed" && isFiniteNumber(color.index)) {
    return indexedToHex(color.index);
  }
  if (color.kind === "oklch" && isFiniteNumber(color.l) && isFiniteNumber(color.c) && isFiniteNumber(color.h)) {
    return oklchToHex(color.l, color.c, color.h);
  }
  return undefined;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function rgbToHex(r: number, g: number, b: number) {
  const channel = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

const ANSI_16 = [
  [0, 0, 0], [205, 0, 0], [0, 205, 0], [205, 205, 0], [0, 0, 238], [205, 0, 205], [0, 205, 205], [229, 229, 229],
  [127, 127, 127], [255, 0, 0], [0, 255, 0], [255, 255, 0], [92, 92, 255], [255, 0, 255], [0, 255, 255], [255, 255, 255],
];

function indexedToHex(index: number): string | undefined {
  const i = Math.round(index);
  if (i < 0 || i > 255) return undefined;
  if (i < 16) {
    const [r, g, b] = ANSI_16[i]!;
    return rgbToHex(r!, g!, b!);
  }
  if (i < 232) {
    const n = i - 16;
    const level = (v: number) => (v === 0 ? 0 : 55 + v * 40);
    return rgbToHex(level(Math.floor(n / 36)), level(Math.floor(n / 6) % 6), level(n % 6));
  }
  const gray = 8 + (i - 232) * 10;
  return rgbToHex(gray, gray, gray);
}

function oklchToHex(l: number, c: number, h: number) {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  const [r, g, bl] = linear.map((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    const srgb = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return srgb * 255;
  });
  return rgbToHex(r!, g!, bl!);
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
