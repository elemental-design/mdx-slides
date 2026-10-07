#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { compileDeck } from './index.js';

const input = process.argv[2];
if (!input) {
  console.error('Usage: mdx-slides-compile path/to/deck.mdx');
  process.exitCode = 1;
} else {
  const path = resolve(input);
  const { slides, frontmatter } = await compileDeck(await readFile(path, 'utf8'), { filePath: path, format: path.endsWith('.md') ? 'md' : 'mdx' });
  // Sibling output keeps relative MDX imports relative to their original directory.
  for (const slide of slides) await writeFile(`${path}.slide-${slide.index + 1}.js`, slide.code);
  await writeFile(`${path}.d.ts`, `export const frontmatter: Record<string, unknown>;\nexport const slides: import('@mdx-slides/core').Slide[];\nexport default slides;\n`);
  const imports = slides.map(slide => `import Content${slide.index} from ${JSON.stringify('./' + basename(path) + '.slide-' + (slide.index + 1) + '.js')};`).join('\n');
  await writeFile(`${path}.js`, imports + `\nexport const frontmatter = JSON.parse(${JSON.stringify(JSON.stringify(frontmatter))});` + '\nexport const slides = [' + slides.map(slide =>
    `{ id: ${JSON.stringify(slide.id)}, title: ${JSON.stringify(slide.title)}, notes: ${JSON.stringify(slide.notes)}, Content: Content${slide.index} }`).join(',\n') + '];\nexport default slides;\n');
}

