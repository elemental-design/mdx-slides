import { build, type Plugin } from 'esbuild';
import { readFile, writeFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileDeck } from '@mdx-slides/compiler';

export interface PDFExportOptions {
  input: string;
  output: string;
  /** Module exporting optional Frame and components. Bundled against the PDF adapter. */
  config?: string;
  theme?: 'light' | 'dark';
  width?: number;
  height?: number;
}
export async function exportPDF(options: PDFExportOptions): Promise<string> {
  const { theme = 'light' } = options;
  if ([options.width, options.height].some(value => value !== undefined && (!Number.isFinite(value) || value <= 0))) throw new Error('PDF dimensions must be positive numbers');
  const input = resolve(options.input);
  const output = resolve(options.output);
  const adapter = fileURLToPath(new URL('./strict-dom.js', import.meta.url));
  const plugin: Plugin = {
    name: 'mdx-slides-pdf',
    setup(api) {
      api.onResolve({ filter: /^react-strict-dom$/ }, () => ({ path: adapter }));
      api.onResolve({ filter: /\?pdf-slide=\d+$/ }, args => ({ path: args.path, namespace: 'pdf-slide' }));
      api.onLoad({ filter: /./, namespace: 'pdf-slide' }, async args => {
        const [path, number] = args.path.split('?pdf-slide=');
        const deck = await compileDeck(await readFile(path!, 'utf8'), { filePath: path, format: path!.endsWith('.md') ? 'md' : 'mdx' });
        return { contents: deck.slides[Number(number)]!.code, loader: 'js', resolveDir: dirname(path!) };
      });
      api.onLoad({ filter: /\.mdx?$/ }, async args => {
        const deck = await compileDeck(await readFile(args.path, 'utf8'), { filePath: args.path, format: args.path.endsWith('.md') ? 'md' : 'mdx' });
        return { loader: 'js', resolveDir: dirname(args.path), contents:
          deck.slides.map(slide => `import Content${slide.index} from ${JSON.stringify(args.path + '?pdf-slide=' + slide.index)};`).join('\n') +
          `\nexport const frontmatter = JSON.parse(${JSON.stringify(JSON.stringify(deck.frontmatter))});\nexport default [` +
          deck.slides.map(slide => `{id:${JSON.stringify(slide.id)},Content:Content${slide.index}}`).join(',') + '];' };
      });
    },
  };
  // Temp files live beside this package so external React/PDF dependencies resolve consistently.
  const temp = await mkdtemp(join(dirname(fileURLToPath(import.meta.url)), '.pdf-export-'));
  try {
    const bundle = join(temp, 'export.mjs');
    const config = options.config ? `import * as config from ${JSON.stringify(resolve(options.config))};` : 'const config = {};';
    const source = `
      import React from 'react';
      import { Document, Page, View, Font, renderToFile } from '@react-pdf/renderer';
      import slides, { frontmatter } from ${JSON.stringify(input)};
      import { defaultComponents, Slide, Theme } from '@mdx-slides/strict-dom';
      import { resolveSlideSize, fitSlide } from '@mdx-slides/core';
      import { configurePDF } from ${JSON.stringify(adapter)};
      ${config}
      const settings = { ...config };
      const canvas = resolveSlideSize(settings.size ?? frontmatter.size);
      const requested = ${JSON.stringify({ width: options.width, height: options.height })};
      const width = requested.width ?? (requested.height === undefined ? canvas.width : requested.height * canvas.width / canvas.height);
      const height = requested.height ?? width * canvas.height / canvas.width;
      const { scale, left, top } = fitSlide({width, height}, canvas);
      const Frame = settings.Frame || Slide;
      const components = { ...defaultComponents, ...settings.components };
      configurePDF(${JSON.stringify(dirname(input))}, ['strong', 'em', 'del', 'code', 'a'].map(key => components[key]));
      Font.registerHyphenationCallback(word => [word]);
      export default async function render(output) {
        const doc = React.createElement(Document, {title: typeof frontmatter.title === 'string' ? frontmatter.title : 'MDX Slides', author: typeof frontmatter.author === 'string' ? frontmatter.author : undefined},
          slides.map(slide => React.createElement(Page, {key: slide.id, size: [width, height], wrap: false},
            React.createElement(View, {style: {width, height, overflow: 'hidden'}},
            React.createElement(View, {style: {position: 'absolute', left, top, width: canvas.width, height: canvas.height, transformOrigin: 'top left', transform: 'scale(' + scale + ')'}},
            React.createElement(Theme, {mode: ${JSON.stringify(theme)}},
              React.createElement(Frame, {style: {width: canvas.width, maxWidth: canvas.width, height: canvas.height, minHeight: canvas.height}},
                React.createElement(slide.Content, {components}))))))));
        await renderToFile(doc, output);
      }
    `;
    const result = await build({ stdin: { contents: source, resolveDir: dirname(fileURLToPath(import.meta.url)), loader: 'js' },
      bundle: true, platform: 'node', format: 'esm', target: 'node20', write: false,
      external: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@react-pdf/renderer'], plugins: [plugin] });
    await writeFile(bundle, result.outputFiles[0]!.contents);
    await mkdir(dirname(output), { recursive: true });
    const renderer = await import(pathToFileURL(bundle).href) as { default: (output: string) => Promise<void> };
    await renderer.default(output);
    return output;
  } finally { await rm(temp, { recursive: true, force: true }); }
}
