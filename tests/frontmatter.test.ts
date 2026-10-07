import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileDeck } from '@mdx-slides/compiler';
import { run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('gray-matter YAML is exported and available inside every slide', async () => {
  const source = '---\ntitle: Portable\ntags: [web, native]\nnested:\n  enabled: true\n---\n\n# {frontmatter.title}\n\n---\n\n# {frontmatter.title} again';
  const deck = await compileDeck(source, { outputFormat: 'function-body' });
  assert.equal(deck.slides.length, 2);
  assert.deepEqual(deck.frontmatter, { title: 'Portable', tags: ['web', 'native'], nested: { enabled: true } });
  for (const slide of deck.slides) {
    const module = await run(slide.code, runtime);
    assert.deepEqual(module.frontmatter, deck.frontmatter);
    assert.match(renderToStaticMarkup(React.createElement(module.default)), /Portable/);
  }
});
test('malformed YAML and reserved bindings fail clearly', async () => {
  await assert.rejects(compileDeck('---\ntitle: [broken\n---\n\n# Hello'));
  await assert.rejects(compileDeck('export const frontmatter = {}\n\n# Hello'), /reserved/);
});
test('plain Markdown, source maps, and literal metadata keys survive', async () => {
  const deck = await compileDeck('---\n__proto__:\n  safe: true\n---\n\n# Hello', { format: 'md', outputFormat: 'function-body', filePath: '/deck.md' });
  const module = await run(deck.slides[0]!.code, runtime);
  assert.deepEqual(module.frontmatter, deck.frontmatter);
  assert.equal(Object.hasOwn(module.frontmatter as object, '__proto__'), true);
  const map = JSON.parse(deck.slides[0]!.map!);
  assert.match(map.sources[0], /deck.md/);
  assert.match(map.sourcesContent[0], /__proto__/);
});
test('remark extensions transform the selected slide', async () => {
  const deck = await compileDeck('# Hello\n\n---\n\n# Next', {
    outputFormat: 'function-body',
    remarkPlugins: [() => tree => {
      for (const child of tree.children) if (child.type === 'heading') child.children = [{ type: 'text', value: 'Changed' }];
    }],
  });
  for (const slide of deck.slides) {
    const module = await run(slide.code, runtime);
    assert.match(renderToStaticMarkup(React.createElement(module.default)), /Changed/);
  }
});
