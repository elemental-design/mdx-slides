import { mdxSlides as rollupMdxSlides, type MdxSlidesOptions } from '@mdx-slides/rollup';
import type { Plugin } from 'vite';
export type { MdxSlidesOptions } from '@mdx-slides/rollup';
export function mdxSlides(options: MdxSlidesOptions = {}): Plugin {
  return { ...rollupMdxSlides(options), enforce: 'pre' } as Plugin;
}
