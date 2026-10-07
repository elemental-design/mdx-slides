import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { exportPDF } from '@mdx-slides/pdf';

test('PDF exporter bundles relative TSX components and emits one sized page per slide', async () => {
  // Keep fixtures in the workspace so their React/Strict DOM imports resolve normally.
  const dir = await mkdtemp(join(process.cwd(), 'tests/.pdf-fixture-'));
  try {
    await writeFile(join(dir, 'card.tsx'), `import { html, css } from 'react-strict-dom';
      const styles = css.create({ card: { padding: 12, backgroundColor: '#334455' } });
      export function Card({ children }) { return <html.div style={styles.card}>{children}</html.div>; }`);
    await writeFile(join(dir, 'deck.mdx'), `---\ntitle: Export test\nauthor: Ada\nnotes: [Private speaker note, Another note]\n---\nimport { Card } from './card.tsx'\n\n# First slide\n\n<Card>A **portable** card.</Card>\n\n---\n\n# Second slide\n\n1. Inline **emphasis** stays in the list.\n2. Another item.\n`);
    const path = await exportPDF({ input: join(dir, 'deck.mdx'), output: join(dir, 'out/deck.pdf'), width: 640, height: 360, theme: 'dark' });
    const pdf = await PDFDocument.load(await readFile(path));
    assert.equal(pdf.getPageCount(), 2);
    assert.equal(pdf.getTitle(), 'Export test');
    assert.equal(pdf.getAuthor(), 'Ada');
    for (const page of pdf.getPages()) assert.deepEqual(page.getSize(), { width: 640, height: 360 });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('PDF exporter reuses the complete example theme and validates dimensions', async () => {
  const dir = await mkdtemp(join(process.cwd(), 'tests/.pdf-fixture-'));
  try {
    const path = await exportPDF({ input: 'examples/web/deck.mdx', config: 'examples/web/pdf.config.ts', output: join(dir, 'example.pdf') });
    const pdf = await PDFDocument.load(await readFile(path));
    assert.equal(pdf.getPageCount(), 6);
    assert.deepEqual(pdf.getPage(0).getSize(), { width: 1280, height: 720 });
    await assert.rejects(exportPDF({ input: 'missing.mdx', output: path, width: 0 }), /positive numbers/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('PDF size comes from deck metadata, with proportional single-dimension overrides', async () => {
  const dir = await mkdtemp(join(process.cwd(), 'tests/.pdf-fixture-'));
  try {
    const input = join(dir, 'deck.md');
    const output = join(dir, 'deck.pdf');
    await writeFile(input, '---\nsize: {width: 1024, height: 768}\n---\n\n# Four by three');
    for (const [options, expected] of [
      [{}, { width: 1024, height: 768 }],
      [{ width: 2048 }, { width: 2048, height: 1536 }],
      [{ height: 384 }, { width: 512, height: 384 }],
      [{ width: 1920, height: 1080 }, { width: 1920, height: 1080 }],
    ] as const) {
      await exportPDF({ input, output, ...options });
      const pdf = await PDFDocument.load(await readFile(output));
      assert.deepEqual(pdf.getPage(0).getSize(), expected);
    }
    await writeFile(join(dir, 'config.ts'), 'export const size = { width: 1600, height: 900 };');
    await exportPDF({ input, output, config: join(dir, 'config.ts') });
    assert.deepEqual((await PDFDocument.load(await readFile(output))).getPage(0).getSize(), { width: 1600, height: 900 });
    await writeFile(input, '---\nsize: {width: 0, height: 720}\n---\n# Invalid size');
    await assert.rejects(exportPDF({ input, output }), /positive numbers/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
