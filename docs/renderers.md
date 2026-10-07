# Cross-platform rendering

MDX → frontmatter + AST slide groups → React modules → Strict DOM templates → host renderer.

The compiler runs at build time. It does not import DOM APIs or execute authored MDX. MDX can contain executable JavaScript and imports; use trusted source content. Core navigation and the shared Strict DOM player have no browser globals. The web package adds browser keyboard input. Package JavaScript retains Strict DOM imports and `css.create` calls until the host applies its platform-specific transform.

## Native / Expo host configuration

Ahead-of-time MDX output avoids changing Metro's transformer or adding runtime evaluation. First compile the deck with `mdx-slides-compile`; import the explicit `deck.mdx.js` entry from your app. Metro resolves imported dependencies for iOS/Android and bundles them normally.

Follow the version-appropriate [official Expo setup](https://react.github.io/react-strict-dom/learn/setup/). Use a compatible Expo SDK/New Architecture and the installed Strict DOM package's React peers. This project pins Strict DOM 0.0.55, whose React peer is React 19. A representative host Babel configuration is:

```js
// babel.config.cjs in the consuming Expo app
const strictPreset = require('react-strict-dom/babel-preset');
module.exports = function (api) {
  const platform = api.caller(caller => caller?.platform);
  const dev = api.caller(caller => caller?.isDev ?? false);
  return {
    presets: [
      'babel-preset-expo',
      [strictPreset, { platform: platform === 'web' ? 'web' : 'native', dev, debug: dev }],
    ],
  };
};
```

The host TypeScript configuration should use `moduleResolution: "bundler"`, `customConditions: ["react-native"]`, and native platform module suffixes. Modern Expo's default Metro configuration handles workspace/package exports. For Expo web, include all shared Strict DOM UI packages and the Strict DOM runtime in PostCSS extraction, and import a CSS file containing `@react-strict-dom;`. The web example shows equivalent extraction for Vite.

The portable `Deck` sets strict layout conformance at its root. Templates use flex, not CSS grid. Not every CSS feature or custom component works on native: use the [Strict DOM compatibility reference](https://react.github.io/react-strict-dom/api/css/). Fonts, image dimensions, accessibility behavior, overflow, and native navigation require device validation.

## Figma host resolution

The sibling `react-designapp` contains `react-strict-dom-figma`, which exports `html` and `css` over design primitives. For a design build, resolve `react-strict-dom` to that adapter **before rendering**, and skip the web Strict DOM Babel optimization/CSS extraction. Its `css.create` returns design style objects; compiled web class names cannot be used as Figma layout styles. Shared package `dist` files retain the original imports and style declarations, so they can be resolved by the design host.

The sibling project's `examples/mdx-figma` is now a working **document** fixture using `@react-platform/mdx/esbuild` and the existing Figma Strict DOM host. It keeps Markdown rules as content and mounts one document in an auto-height Artboard. React/JSX-runtime/TestRenderer resolution is unified for that build. See its README for generation and current validation limits.

A frame-per-slide Figma deck exporter is future work in **mdx-slides**, not part of that generic MDX example. It will need to validate shared theme tokens, dynamic styles, rich text, fonts, images, list layout and frame positioning against the existing adapter. Positional slide IDs will also need authored stable IDs before reliable incremental synchronization.

`renderToJSON` produces REST-shaped Figma JSON, not a `.fig` file. Live insertion uses the sibling project's separate Plugin API bridge and has not been validated by the document fixture. Do not import the browser player or alias `react-dom` for design rendering.

## Bundler boundaries

Rollup/Vite: the slide plugin compiles `.md`/`.mdx`; host plugins resolve JS/TSX imports, choose platform exports, and transform Strict DOM styles. React Native: AOT compiler produces ordinary JS files; Metro retains native module resolution and Babel. Figma: AOT or Rollup output uses the design Strict DOM runtime and the design renderer. Avoid bundling React or platform-specific modules into a universal MDX artifact.

The old `mdx` JSX factory and injected renderer string are unnecessary with MDX 3's automatic JSX runtime. The official [`@mdx-js/rollup`](https://mdxjs.com/packages/rollup/) handles ordinary single-document MDX; our adapter adds deck splitting, metadata, and slide modules.
