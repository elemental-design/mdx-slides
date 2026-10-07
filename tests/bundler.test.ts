import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rollup } from 'rollup';
import { mdxSlides } from '@mdx-slides/rollup';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('Rollup bundles MDX with relative JSX imports, metadata, and separate slides', async () => {
  const dir = await mkdtemp(resolve('tests/.bundle-'));
  try {
    await writeFile(`${dir}/Thing.js`, 'export const label = "Relative import";');
    await writeFile(`${dir}/deck.mdx`, '---\ntitle: Bundled\n---\n\nimport {label} from "./Thing.js"\n\n# {label}\n\n---\n\n# {frontmatter.title}');
    const bundle = await rollup({ input: `${dir}/deck.mdx`, plugins: [mdxSlides()], external: id => id.startsWith('react/') });
    const output = `${dir}/bundle.mjs`;
    await bundle.write({ file: output, format: 'es', sourcemap: true });
    await bundle.close();
    const module = await import(pathToFileURL(output).href);
    assert.equal(module.slides.length, 2);
    assert.equal(module.frontmatter.title, 'Bundled');
    assert.match(renderToStaticMarkup(React.createElement(module.slides[0].Content)), /Relative import/);
    assert.match(renderToStaticMarkup(React.createElement(module.slides[1].Content)), /Bundled/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('Rollup handles .md and include/exclude filtering', async () => {
  const plugin = mdxSlides({ include: '**/*.md', exclude: '**/skip.md' });
  const transform = plugin.transform as Function;
  assert.equal(await transform.call({}, '# Hello', '/tmp/skip.md'), null);
  assert.equal(await transform.call({}, '# Hello', '/tmp/deck.mdx'), null);
  assert.match((await transform.call({}, '# Hello', '/tmp/deck.md')).code, /export const slides/);
  assert.throws(() => mdxSlides({ outputFormat: 'function-body' }), /program output/);
});
