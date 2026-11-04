import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  cleanLastNewline,
  getHighlighterOptions,
  getSharedHighlighter,
  renderDiffWithHighlighter,
  type FileDiffMetadata,
} from "@pierre/diffs";
import type { DiffSpan, HastNode, HighlightedDiffCode, HighlightedDiffSet, PierreAppearance } from "../types.js";

const PIERRE_THEME_NAMES = {
  dark: "pierre-dark",
  light: "pierre-light",
} as const;

const PIERRE_RENDER_OPTIONS = {
  useTokenTransformer: false,
  tokenizeMaxLineLength: 1000,
  lineDiffType: "word-alt" as const,
  maxLineDiffLength: 2000,
} as const;

type HighlightOptions = ReturnType<typeof getHighlighterOptions>;
type LoadedTheme = {
  cacheKey: string;
  highlighterTheme: string | Record<string, unknown>;
  renderTheme: string;
};

const highlighterOptionsByKey = new Map<string, HighlightOptions>();
const themesByPath = new Map<string, Promise<Record<string, unknown>>>();

export async function loadHighlightedDiff(metadata: FileDiffMetadata): Promise<HighlightedDiffSet> {
  const [dark, light] = await Promise.all([
    highlightForAppearance(metadata, "dark"),
    highlightForAppearance(metadata, "light"),
  ]);

  return { dark, light };
}

export function flattenHighlightedLine(
  node: HastNode | undefined,
  appearance: PierreAppearance,
  emphasisBg: string,
  fallbackText: string,
) {
  const spans: DiffSpan[] = [];
  const colorVariable = appearance === "light" ? "--diffs-token-light" : "--diffs-token-dark";

  const visit = (current: HastNode | undefined, inherited: Pick<DiffSpan, "fg" | "bg">) => {
    if (!current) {
      return;
    }

    if (current.type === "text") {
      mergeSpan(spans, {
        text: tabify(current.value),
        fg: inherited.fg,
        bg: inherited.bg,
      });
      return;
    }

    const properties = current.properties ?? {};
    const styles = parseStyleValue(properties.style);
    const nextStyle: Pick<DiffSpan, "fg" | "bg"> = {
      fg: styles.get(colorVariable) ?? styles.get("color") ?? inherited.fg,
      bg: Object.prototype.hasOwnProperty.call(properties, "data-diff-span") ? emphasisBg : inherited.bg,
    };

    for (const child of current.children ?? []) {
      visit(child, nextStyle);
    }
  };

  visit(node, {});

  if (spans.length > 0) {
    return spans;
  }

  return fallbackText.length > 0 ? [{ text: fallbackText }] : [];
}

export function cleanDiffLine(line: string | undefined) {
  return tabify(cleanLastNewline(line ?? "").replace(/\r$/, ""));
}

async function highlightForAppearance(metadata: FileDiffMetadata, appearance: PierreAppearance): Promise<HighlightedDiffCode> {
  try {
    const language = metadata.lang ?? "text";
    const theme = await getTheme(appearance);
    const cacheKey = `${theme.cacheKey}:${language}`;
    const highlighterOptions =
      highlighterOptionsByKey.get(cacheKey) ??
      getHighlighterOptions(language, { theme: theme.highlighterTheme } as never);

    if (!highlighterOptionsByKey.has(cacheKey)) {
      highlighterOptionsByKey.set(cacheKey, highlighterOptions);
    }

    const highlighter = await getSharedHighlighter({
      ...highlighterOptions,
      preferredHighlighter: "shiki-wasm",
    });

    const highlighted = renderDiffWithHighlighter(
      metadata,
      highlighter,
      { ...PIERRE_RENDER_OPTIONS, theme: theme.renderTheme },
    );

    return {
      deletionLines: highlighted.code.deletionLines as Array<HastNode | undefined>,
      additionLines: highlighted.code.additionLines as Array<HastNode | undefined>,
    };
  } catch {
    return {
      deletionLines: [],
      additionLines: [],
    };
  }
}

async function getTheme(appearance: PierreAppearance): Promise<LoadedTheme> {
  const suffix = appearance.toUpperCase();
  const commonFile = process.env.PIERRE_DIFF_THEME_FILE?.trim();
  const appearanceFile = process.env[`PIERRE_DIFF_THEME_${suffix}_FILE`]?.trim();
  const filePath = appearanceFile || commonFile;

  if (filePath) {
    const absolutePath = resolve(filePath);
    let themePromise = themesByPath.get(absolutePath);
    if (!themePromise) {
      themePromise = readFile(absolutePath, "utf8").then((contents) => {
        const theme = JSON.parse(contents) as Record<string, unknown>;
        if (typeof theme.name !== "string" || !theme.name) {
          throw new Error(`Shiki theme at ${absolutePath} must have a name`);
        }
        return theme;
      });
      themesByPath.set(absolutePath, themePromise);
    }

    const theme = await themePromise;
    return {
      cacheKey: `${absolutePath}:${theme.name}`,
      highlighterTheme: theme,
      renderTheme: theme.name as string,
    };
  }

  const commonTheme = process.env.PIERRE_DIFF_THEME?.trim();
  const appearanceTheme = process.env[`PIERRE_DIFF_THEME_${suffix}`]?.trim();
  const name = appearanceTheme || commonTheme || PIERRE_THEME_NAMES[appearance];
  return { cacheKey: name, highlighterTheme: name, renderTheme: name };
}

function tabify(text: string) {
  return text.replace(/\t/g, "    ");
}

function parseStyleValue(styleValue: unknown) {
  const styles = new Map<string, string>();
  if (typeof styleValue !== "string") {
    return styles;
  }

  for (const segment of styleValue.split(";")) {
    const separator = segment.indexOf(":");
    if (separator <= 0) {
      continue;
    }

    const key = segment.slice(0, separator).trim();
    const value = segment.slice(separator + 1).trim();
    if (key && value) {
      styles.set(key, value);
    }
  }

  return styles;
}

function mergeSpan(target: DiffSpan[], next: DiffSpan) {
  if (next.text.length === 0) {
    return;
  }

  const previous = target[target.length - 1];
  if (previous && previous.fg === next.fg && previous.bg === next.bg) {
    previous.text += next.text;
    return;
  }

  target.push(next);
}
