import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileDeck } from '@mdx-slides/compiler';
import { run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DeckFrames, clampIndex } from '@mdx-slides/core';
import { createPrimitiveComponents } from '@mdx-slides/primitives';

test('AST splitting preserves code fences, nested rules, and shared exports', async () => {
  const { slides } = await compileDeck('export const word = "Hello"\n\n# {word}\n\n```md\n---\n```\n\n> ---\n\n---\n\n# Second', { outputFormat: 'function-body' });
  assert.equal(slides.length, 2);
  const modules = await Promise.all(slides.map(slide => run(slide.code, runtime)));
  assert.match(renderToStaticMarkup(React.createElement(modules[0].default)), /Hello/);
  assert.match(renderToStaticMarkup(React.createElement(modules[0].default)), /---/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(modules[1].default)), /Hello/);
});
test('empty slides remain addressable and indices clamp', async () => {
  assert.equal((await compileDeck('---\n\n# End\n\n---', { frontmatter: false })).slides.length, 3);
  assert.equal(clampIndex(99, 2), 1);
  assert.equal(clampIndex(-1, 2), 0);
  assert.throws(() => clampIndex(NaN, 2));
});
test('same compiled components render to primitives and separate frames', async () => {
  const { slides: compiled } = await compileDeck('# Hello\n\nA **portable** deck.\n\n---\n\n# Next', { outputFormat: 'function-body' });
  const slides = await Promise.all(compiled.map(async slide => ({ ...slide, Content: (await run(slide.code, runtime)).default })));
  const components = createPrimitiveComponents({ View: 'view', Text: 'text', Image: 'image' });
  const markup = renderToStaticMarkup(React.createElement(DeckFrames, { slides, Frame: 'section', components }));
  assert.equal((markup.match(/<section /g) || []).length, 2);
  assert.match(markup, /<text/);
  assert.doesNotMatch(markup, /<h1/);
  assert.match(markup, /id="slide-2"/);
});
