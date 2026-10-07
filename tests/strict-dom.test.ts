import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformAsync } from '@babel/core';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { resolve } from 'node:path';
import { createServer as createHttpServer } from 'node:http';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);

test('shared templates render through actual Strict DOM after its Babel transform', async () => {
  const path = new URL('../packages/strict-dom/dist/index.test.js', import.meta.url);
  const source = await readFile(new URL('../packages/strict-dom/dist/index.js', import.meta.url), 'utf8');
  const result = await transformAsync(source, {
    filename: path.pathname, babelrc: false, configFile: false,
    presets: [[require('react-strict-dom/babel-preset'), { platform: 'web', dev: false }]],
  });
  assert.ok(result?.code);
  assert.doesNotMatch(result.code, /css\.create\(/);
  const server = await createServer({
    root: resolve('examples/web'), configFile: resolve('examples/web/vite.config.ts'),
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const runtimePath = require.resolve('react-strict-dom/runtime');
    const devRuntime = await server.transformRequest(`/@fs${runtimePath}?v=regression`);
    assert.ok(devRuntime?.code);
    assert.doesNotMatch(devRuntime.code, /stylex\.create\(/);
    const { Deck, Row, Column } = await server.ssrLoadModule('@mdx-slides/strict-dom');
    const Content = () => React.createElement(Row, null, React.createElement(Column, null, 'Portable'));
    const output = renderToStaticMarkup(React.createElement(Deck, { slides: [{ id: 'one', title: 'Test', Content }] }));
    assert.match(output, /Portable/);
    assert.match(output, /Previous/);
    assert.match(output, /class=/);
    assert.ok((result.metadata as { stylex?: unknown[] }).stylex?.length);
  } finally { await server.close(); }
});
