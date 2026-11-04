# @tanvesh01/pierre-diffs

Pierre-themed inline diff rendering for Pi.

<img width="2588" height="1664" alt="image" src="https://github.com/user-attachments/assets/f30ef920-d8aa-477c-916b-afe2ca465440" />


This package replaces Pi's default `edit` and `write` result rendering with a Pierre-styled diff block while keeping the rest of Pi's chat UI unchanged.

## What It Does

- Replaces inline `edit` and `write` tool result rendering
- Builds real before/after diffs from file contents
- Uses `@pierre/diffs` for diff modeling and highlighting
- Uses `@pierre/theme` for Pierre dark/light palettes
- Supports custom Shiki syntax-highlighting themes through environment variables
- Keeps Pi's compact inline diff shape instead of switching to a separate full-screen viewer

## Install

### npm

```bash
pi install npm:@tanvesh01/pierre-diffs@0.2.1
```

### git

```bash
pi install git:github.com/tanvesh01/pierre-diffs@v0.2.1
```

### local development

```bash
pi --no-extensions -e ./extensions/diff-viewer/index.ts
```

## Behavior

After install, Pi will render `edit` and `write` results with:

- a Pierre-themed title row
- Pierre-owned full-width diff backgrounds
- syntax-aware highlighted diff lines when available
- compact inline context/add/remove rows inside the chat stream

Older sessions created before the full Pierre payload existed continue to render with Pi's original stored tool result UI. Older Pierre-backed sessions can lazily recompute syntax highlighting when they are reopened.

### Custom syntax themes

Use `PIERRE_DIFF_THEME` for one named Shiki theme, or `PIERRE_DIFF_THEME_DARK` and/or `PIERRE_DIFF_THEME_LIGHT` to configure names independently. To load user-provided Shiki theme JSON files, use `PIERRE_DIFF_THEME_FILE` for both appearances, or `PIERRE_DIFF_THEME_DARK_FILE` and `PIERRE_DIFF_THEME_LIGHT_FILE` independently. Appearance-specific settings take precedence over the shared setting. File paths are resolved from the working directory, and each JSON theme must include a `name` field.

```bash
PIERRE_DIFF_THEME_DARK=github-dark PIERRE_DIFF_THEME_LIGHT=github-light pi
PIERRE_DIFF_THEME_DARK_FILE=./themes/my-dark-theme.json pi
```

For example, a theme file can use Shiki's theme JSON format:

```json
{
  "$schema": "https://raw.githubusercontent.com/shikijs/shiki/main/packages/shiki/src/themes/theme.schema.json",
  "name": "my-dark-theme",
  "type": "dark",
  "colors": { "editor.foreground": "#d4d4d4", "editor.background": "#1e1e1e" },
  "tokenColors": []
}
```

These settings change syntax token highlighting only. The diff block's terminal colors continue to follow Pi's current dark/light appearance.

## Scope

This package changes only:

- `edit`
- `write`

Everything else in Pi keeps its normal rendering and behavior.

## Compatibility

- Tested against `@mariozechner/pi-coding-agent` `0.65.2`
- Built as a Pi package with a `pi.extensions` manifest
- Internally patches Pi's `ToolExecutionComponent` for `edit` and `write` so Pi's host success/error/pending background does not show behind the Pierre block

Because this package patches Pi internals for those two tools, future Pi internal UI changes may require updates here.

## How It Works

1. Re-registers Pi's built-in `edit` and `write` tools
2. Delegates actual file mutation to Pi's original tool implementations
3. Captures file contents before and after the tool runs
4. Builds normalized diff metadata with `@pierre/diffs`
5. Precomputes Pierre-highlighted diff output for dark and light themes
6. Renders a Pierre-owned inline tool block inside Pi's chat stream

## Development

Install dependencies:

```bash
npm install
```

Type-check the extension:

```bash
npx tsc --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck extensions/diff-viewer/index.ts
```

Preview the package contents before publish:

```bash
npm pack --dry-run
```

## License

MIT
