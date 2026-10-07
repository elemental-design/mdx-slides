#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { exportPDF } from './index.js';
try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    output: { type: 'string', short: 'o' }, config: { type: 'string' }, theme: { type: 'string', default: 'light' },
    width: { type: 'string' }, height: { type: 'string' }, help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) console.log('Usage: mdx-slides-pdf deck.mdx [-o deck.pdf] [--config pdf.config.ts] [--theme light|dark] [--width 1280 --height 720]');
  else {
    if (positionals.length !== 1) throw new Error('Pass exactly one .md or .mdx deck path. Use --help for usage.');
    if (values.theme !== 'light' && values.theme !== 'dark') throw new Error('Theme must be light or dark');
    const output = await exportPDF({ input: positionals[0]!, output: values.output ?? positionals[0]!.replace(/\.mdx?$/, '') + '.pdf',
      config: values.config, theme: values.theme, width: values.width === undefined ? undefined : Number(values.width), height: values.height === undefined ? undefined : Number(values.height) });
    console.log(`Exported ${output}`);
  }
} catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
