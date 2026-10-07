import { createProcessor } from '@mdx-js/mdx';
import { compileMDX, parseMDX, type MDXCompileOptions } from '@react-platform/mdx';
import type { Root, RootContent } from 'mdast';
import type { Plugin } from 'unified';

export type { Metadata } from '@react-platform/mdx';
export interface DeckCompileOptions extends MDXCompileOptions {}
export interface CompiledSlide { id: string; title: string; notes?: string; index: number; code: string; map?: string }
export interface CompiledDeck { slides: CompiledSlide[]; frontmatter: Record<string, unknown> }

/** Presentation-only splitting. General MDX/frontmatter compilation lives in React Platform. */
export async function compileDeck(source: string, options: DeckCompileOptions = {}): Promise<CompiledDeck> {
  const { filePath = 'deck.mdx', frontmatter: enabled = true, remarkPlugins = [], ...rest } = options;
  const parsed = parseMDX(source, { frontmatter: enabled });
  const notes = parsed.frontmatter.notes;
  if (notes !== undefined && (!Array.isArray(notes) || !notes.every(note => typeof note === 'string'))) {
    throw new TypeError('Frontmatter notes must be an array of strings, one per slide');
  }
  const processor = createProcessor({ ...rest, format: rest.format === 'md' ? 'md' : 'mdx', remarkPlugins });
  const tree = processor.parse(parsed.content) as Root;
  const shared = tree.children.filter(node => node.type === 'mdxjsEsm');
  const groups: RootContent[][] = [[]];
  for (const node of tree.children) {
    if (node.type === 'mdxjsEsm') continue;
    if (node.type === 'thematicBreak') groups.push([]);
    else groups.at(-1)!.push(node);
  }
  const slides = await Promise.all(groups.map(async (children, index) => {
    const selectSlide: Plugin<[], Root> = () => root => { root.children = structuredClone([...shared, ...children]); };
    const result = await compileMDX(source, {
      ...rest, filePath, frontmatter: enabled, format: rest.format === 'md' ? 'md' : 'mdx',
      remarkPlugins: [selectSlide, ...(remarkPlugins ?? [])],
    });
    const heading = children.find(node => node.type === 'heading');
    const title = heading?.children.map(node => 'value' in node ? node.value : '').join('') || `Slide ${index + 1}`;
    return { id: `slide-${index + 1}`, title, notes: Array.isArray(notes) ? notes[index] as string | undefined : undefined,
      index, code: result.code, map: result.map };
  }));
  return { slides, frontmatter: parsed.frontmatter };
}
