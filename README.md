# mdx-slides

A TypeScript monorepo for MDX presentations on web, React Native, and design renderers. MDX 3 compiles each slide into a React component. React Strict DOM supplies shared typography, templates, and flex layouts through `html.*` and `css.create`.

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

Packages build to ESM JavaScript plus TypeScript declarations in `dist`. The web example includes the Strict DOM Babel transform and PostCSS extraction, including the Strict DOM runtime's own styles. `pnpm dev` builds the linked `@react-platform/mdx` compiler in the sibling `react-platform` repository and then local packages once; run `pnpm build:packages` after editing library sources.

## Authoring and frontmatter

```mdx
---
title: Portable presentations
author: Ada
tags: [web, native, figma]
---

# {frontmatter.title}

<Row>
  <Column>Shared components</Column>
  <Column>Shared layout</Column>
</Row>

---

# Next slide

A **portable** presentation.
```

Leading YAML frontmatter is enabled by default, parsed with `gray-matter` and the `yaml` engine, and exported as `frontmatter` from the deck and every slide module. Nested mappings, arrays, booleans, and numbers are supported. Malformed YAML fails compilation. Metadata must be a mapping and serializable as JSON. The `frontmatter` binding is reserved; expressions can read it directly. TOML/JSON frontmatter and per-slide frontmatter are not implemented. Set `frontmatter: false` if a deck intentionally begins with a slide separator instead of a metadata block.

Top-level Markdown thematic breaks separate slides. Rules inside fenced code, quotes, or lists remain content. Empty slides are preserved. Imports/exports are available to every slide, but module-local state is per slide; share state through imported modules. Custom JSX must use portable components. Explicit lowercase JSX bypasses Markdown mapping: prefer Markdown, `html.*`, or components such as `Row` and `Column`.

## Packages

| Package | Responsibility |
| --- | --- |
| `@mdx-slides/compiler` | Presentation AST splitting, notes, shared MDX compiler adapter and AOT deck CLI |
| `@mdx-slides/core` | Typed slide/frame contracts and navigation state |
| `@mdx-slides/strict-dom` | Shared styled player, slide template, Markdown components, Row/Column |
| `@mdx-slides/web` | Strict DOM player with browser keyboard navigation |
| `@mdx-slides/rollup` | Rollup `.md`/`.mdx` integration with include/exclude filters |
| `@mdx-slides/vite` | Thin Vite adapter for the same plugin |
| `@mdx-slides/pdf` | Node PDF exporter and Strict DOM-to-PDF adapter |
| `@mdx-slides/primitives` | Optional low-level native/design compatibility adapter |

## Rollup and Vite

```ts
import { mdxSlides } from '@mdx-slides/vite'; // or @mdx-slides/rollup
export default {
  plugins: [mdxSlides({ include: '**/*.{md,mdx}', exclude: '**/drafts/**' })],
};
```

```tsx
import slides, { frontmatter } from './deck.mdx';
import { Deck } from '@mdx-slides/web';
<Deck slides={slides} />
```

The plugin emits automatic JSX runtime imports and separate slide modules. Relative imports remain relative to the deck. It returns per-slide source maps; the synthetic deck index has no authored source positions. Host builds handle TypeScript/TSX dependencies and Strict DOM transforms. The included Vite example demonstrates the full setup. A bare Rollup build also needs normal dependency resolution, JSX/TypeScript handling for imported components, and Strict DOM Babel/CSS setup.

MDX 3 replaces older injected `React`/`mdx` renderer strings. Keep `babelOptions` in the host pipeline so native and web can use their appropriate presets. `remarkPlugins` and `rehypePlugins` pass through to the compiler for GFM, math, highlighting, and other extensions; install and configure those plugins separately. `.md` uses Markdown syntax, `.mdx` enables JSX/expressions.

## React Native / Metro

Use the same Strict DOM `Deck`, without importing the browser keyboard layer. Precompile MDX before starting Metro:

```sh
pnpm build:packages
pnpm exec mdx-slides-compile path/to/deck.mdx
```

The CLI emits sibling `deck.mdx.js`, `deck.mdx.d.ts`, and per-slide JavaScript modules, preserving relative import paths. Generated output is overwritten on subsequent runs. Metro then handles module resolution and native platform dependencies as usual.

```tsx
import slides from './deck.mdx.js';
import { Deck } from '@mdx-slides/strict-dom';
export default function App() {
  return <Deck slides={slides} />;
}
```

A React Native MDX-specific bundler is unnecessary for this path: compilation is shared, while Metro is the native bundler. A direct Metro MDX transformer could be added later for on-edit compilation; it is not included yet. Re-run the CLI after deck changes. Configure Strict DOM's native Babel preset and `react-native` export condition in the host. See [native and Figma setup](docs/renderers.md).

## Status

Strict TypeScript package/example checking, MDX/frontmatter/plugin execution, Rollup relative-import bundling, source maps, primitive frame rendering, and actual Strict DOM web rendering are tested. The web example builds with extracted CSS. Native/Expo and actual Figma host rendering still need integration validation. Animations, synchronized presenter windows, and persistent authored slide IDs remain future work.

References: [MDX compiler](https://mdxjs.com/packages/mdx/), [MDX frontmatter](https://mdxjs.com/guides/frontmatter/), [modern Rollup integration](https://mdxjs.com/packages/rollup/), [Strict DOM Vite setup](https://react.github.io/react-strict-dom/learn/setup-vite/), [Strict DOM Expo setup](https://react.github.io/react-strict-dom/learn/setup/).

## Presenter mode, fullscreen, and themes

The browser player supports **Option/Alt + P** to toggle presenter mode. It shows the current slide, a scaled next-slide preview, a pausable/resettable elapsed timer, and speaker notes. The timer starts on first entry and continues when presenter tools are hidden. Slide navigation updates both the preview and notes; the final slide shows “End of deck”.

Click **Focus mode** or press **Z** to hide all UI within the current browser viewport; press Z again or Escape to return. Focus mode preserves the selected slide and presenter state.

Click **Full screen** or press **F** for the audience view: only the current slide is visible. It requests browser fullscreen where supported, with a slide-only viewport fallback when unavailable. Press **Escape** (or F again) to exit. Presenter mode is restored after exiting fullscreen. This is a single-window presenter view; synchronized audience/presenter windows are not implemented.

Speaker notes are plain text in YAML frontmatter, aligned by slide position:

```yaml
notes:
  - |
    Introduce the topic.
    Mention the main takeaway.
  - Explain the next slide.
```

Notes are attached to the typed `Slide.notes` field by both the CLI and Rollup/Vite adapter. They are excluded from audience UI, but remain in bundled deck metadata; they are not confidential data.

The [theming example](examples/web/theme.tsx) replaces the slide frame and Markdown components with custom typography, diamond bullets, numbered badges, cards, and column layouts. [Shared tokens](packages/strict-dom/src/tokens.css.ts) use `css.defineVars`; `Theme` applies light/dark `css.createTheme` overrides to the whole subtree. The example starts with the system preference and offers a Light mode / Dark mode toggle. Current slide, preview, and presenter controls inherit the same colors.

```tsx
import { Theme } from '@mdx-slides/strict-dom';
import { Deck } from '@mdx-slides/web';
<Theme mode="dark">
  <Deck slides={slides} Frame={ExampleFrame} components={exampleComponents} />
</Theme>
```

`Frame` is also supported by the portable Strict DOM player and `DeckSlide`. The browser player fits a configurable canvas (1280 × 720 by default) to the viewport, including presenter previews. Fullscreen/keyboard/timer tools stay in the browser package; themes, custom components, and templates remain reusable for native/design hosts.

## PDF export

Export without a browser using `@react-pdf/renderer` (the PDF generator, rather than the similarly named PDF viewer). Each slide becomes one fixed-size page with selectable text. PDF page dimensions are measured in points, not raster pixels; increasing them scales text and vectors without reflowing the slide. Speaker notes and player controls are omitted.

```sh
# The full theming example, using its shared Strict DOM components
pnpm export:pdf:example

# Any deck; defaults to a 16:9 landscape page and light theme
pnpm export:pdf path/to/deck.mdx -o output/deck.pdf
pnpm export:pdf path/to/deck.mdx -o output/deck-dark.pdf --theme dark

# Custom dimensions in PDF points
pnpm export:pdf path/to/deck.mdx -o output/deck.pdf --width 960 --height 540
```

`pnpm exec mdx-slides-pdf --help` runs the CLI directly after building packages. Both `.md` and `.mdx` are supported, including YAML metadata, relative imports, and TypeScript/TSX components. The default output is beside the input with a `.pdf` extension.

Use `--config path/to/pdf.config.ts` to export your own `Frame` and `components`. The example reuses its web template unchanged:

```ts
// examples/web/pdf.config.ts
export { ExampleFrame as Frame, exampleComponents as components } from './theme.js';
```

The exporter bundles these components with a PDF implementation of `react-strict-dom`: `html.*` becomes PDF text/views/images and raw `css.create` styles and light/dark tokens become PDF styles. It handles shared flex layouts, typography, links, lists, and PNG/JPEG images (relative paths resolve from the deck directory). This is a static rendering adapter, so layouts can differ from the browser. Browser-only components, CSS selectors/media queries, grid, animation, and precompiled Strict DOM class names are unsupported; pass the original TypeScript sources. Dynamic function styles and arbitrary custom SVG components are not implemented. Default fonts are PDF Helvetica/Courier; custom font families require registration with the PDF renderer. Check long slide content for overflow; pages do not split automatically.

For Node callers:

```ts
import { exportPDF } from '@mdx-slides/pdf';
await exportPDF({
  input: 'deck.mdx', output: 'deck.pdf', theme: 'dark',
  config: 'pdf.config.ts', width: 1280, height: 720,
});
```

PDF generation uses React components and hooks on Node. The PDF adapter stays separate from the web/native runtime and can serve as a model for a future Figma renderer.

## Slide dimensions and aspect ratio

The default logical canvas is **1280 × 720 (16:9)**. Normal view, presenter view, next-slide preview, focus mode, fullscreen, and PDF export fit the entire canvas proportionally. Different viewport ratios show letterboxing rather than cropping. Frames receive the canvas width/height and must forward their `style` prop, as `ExampleFrame` does; slide padding is included in those dimensions.

Set a deck's logical dimensions in YAML frontmatter:

```yaml
size:
  width: 1920
  height: 1080
```

Custom ratios are supported, such as `width: 1024, height: 768` for 4:3. A width alone derives a 16:9 height. The web example reads this metadata; in another host, pass it explicitly:

```tsx
import { resolveSlideSize } from '@mdx-slides/core';
import slides, { frontmatter } from './deck.mdx';
<Deck slides={slides} size={resolveSlideSize(frontmatter.size)} />
// Or: <Deck slides={slides} size={{ width: 1024, height: 768 }} />
```

This changes the authoring canvas, so adjust your theme's fonts and spacing for the chosen dimensions. `size` works with both web and portable Strict DOM decks.

PDF export automatically reads `frontmatter.size`; `pdf.config.ts` can export a `size` override. CLI `--width` / `--height` control the **output page** independently of that logical canvas. Specify one dimension to preserve the deck's ratio, or both for a particular page shape (the slide is centered and letterboxed if the ratios differ):

```sh
# Export the same composition at 1920 × 1080 points
pnpm export:pdf:example --width 1920 --height 1080

# Derive the height from the deck's aspect ratio
pnpm export:pdf deck.mdx -o deck.pdf --width 1920
```

PDF is vector-based, so there is no global image DPI setting. Embedded bitmap sharpness depends on the source image resolution.

## Shared MDX ownership

General document compilation now lives in `@react-platform/mdx` in the sibling React Platform repository. It owns MDX 3, YAML metadata, source maps and optional esbuild loading. `@mdx-slides/compiler` preserves its API while delegating compilation to that package; slide separators, shared deck imports, IDs/titles and speaker notes stay here. Web/native templates, players and PDF export also stay here.

The unpublished compiler uses a local `link:` dependency. Keep `react-platform` beside this repository and install its workspace dependencies before running mdx-slides. `build:packages` builds the shared compiler first; release packaging will replace the link with a published version.

React Designapp's `examples/mdx-figma` renders an ordinary MDX document through its existing Strict DOM Figma adapter. It does not render slide decks. A frame-per-slide Figma export feature remains future work in mdx-slides.
