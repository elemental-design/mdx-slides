import { readFile } from 'node:fs/promises';
import { createFilter, type FilterPattern } from '@rollup/pluginutils';
import { compileDeck, type DeckCompileOptions } from '@mdx-slides/compiler';
import type { Plugin } from 'rollup';

export interface MdxSlidesOptions extends DeckCompileOptions {
  include?: FilterPattern;
  exclude?: FilterPattern;
}
export function mdxSlides(options: MdxSlidesOptions = {}): Plugin {
  const { include, exclude, ...compilerOptions } = options;
  if (compilerOptions.outputFormat === 'function-body' || compilerOptions.jsx) {
    throw new Error('The bundler requires program output with the automatic JSX runtime');
  }
  const filter = createFilter(include, exclude);
  const virtual = /^(.*\.mdx?)\?mdx-slide=(\d+)$/;
  return {
    name: 'mdx-slides',
    resolveId(id) { if (virtual.test(id)) return id; },
    async transform(source, id) {
      if (!/\.mdx?$/.test(id) || !filter(id)) return null;
      const deck = await compileDeck(source, { ...compilerOptions, filePath: id, format: id.endsWith('.md') ? 'md' : 'mdx' });
      return {
        code: deck.slides.map(slide => `import Content${slide.index} from ${JSON.stringify(id + '?mdx-slide=' + slide.index)};`).join('\n') +
          `\nexport const frontmatter = JSON.parse(${JSON.stringify(JSON.stringify(deck.frontmatter))});\nexport const slides = [` + deck.slides.map(slide =>
            `{id:${JSON.stringify(slide.id)},title:${JSON.stringify(slide.title)},notes:${JSON.stringify(slide.notes)},Content:Content${slide.index}}`).join(',') +
          '];\nexport default slides;',
        map: null, // Synthetic import/metadata module has no authored source positions.
      };
    },
    async load(id) {
      const match = id.match(virtual);
      if (!match) return null;
      this.addWatchFile(match[1]!);
      const deck = await compileDeck(await readFile(match[1]!, 'utf8'), {
        ...compilerOptions, filePath: match[1]!, format: match[1]!.endsWith('.md') ? 'md' : 'mdx',
      });
      const slide = deck.slides[Number(match[2])];
      if (!slide) this.error(`Missing slide in ${id}`);
      return { code: slide.code, map: slide.map ? JSON.parse(slide.map) : null };
    },
  };
}
