import { defineConfig, transformWithEsbuild } from 'vite';
import { mdxSlides } from '@mdx-slides/vite';
import { transformAsync } from '@babel/core';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const preset = require('react-strict-dom/babel-preset');
const postcss = require('react-strict-dom/postcss-plugin');
const root = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ command }) => ({
  plugins: [mdxSlides(), {
    // A new plugin identity also invalidates Vite's cached uncompiled dev runtime.
    name: 'strict-dom-presentation-styles',
    enforce: 'pre',
    async transform(code, id) {
      const filename = id.split('?')[0]!;
      if (!/\.[cm]?[jt]sx?$/.test(filename) || !(/packages\/(strict-dom|web)\/dist\//.test(filename) || /react-strict-dom\/dist\//.test(filename) || /examples\/web\/(theme|main)\.[jt]sx?$/.test(filename))) return null;
      const input = /\.tsx?$/.test(filename) ? (await transformWithEsbuild(code, filename, { loader: filename.endsWith('.tsx') ? 'tsx' : 'ts', jsx: 'automatic' })).code : code;
      const result = await transformAsync(input, {
        filename, babelrc: false, configFile: false, sourceMaps: true,
        presets: [[preset, { platform: 'web', dev: command === 'serve', rootDir: root }]],
      });
      return result?.code ? { code: result.code, map: result.map } : null;
    },
  }],
  css: { postcss: { plugins: [postcss({
    include: [`${root}/examples/web/theme.tsx`, `${root}/packages/strict-dom/dist/*.js`, `${root}/packages/web/dist/*.js`, `${root}/node_modules/react-strict-dom/dist/web/*.js`],
    babelConfig: { parserOpts: { plugins: ['typescript', 'jsx'] }, babelrc: false, configFile: false, presets: [[preset, { platform: 'web', rootDir: root }]] },
  })] } },
  ssr: { noExternal: ['react-strict-dom', '@mdx-slides/strict-dom'] },
  optimizeDeps: { exclude: ['@mdx-slides/strict-dom', '@mdx-slides/web', 'react-strict-dom'] },
}));
