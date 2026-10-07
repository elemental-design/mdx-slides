import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatElapsed, isPresenterShortcut } from '../packages/web/src/presentation.js';
import { compileDeck } from '@mdx-slides/compiler';

test('presenter shortcut uses physical P for macOS Option+P', () => {
  assert.equal(isPresenterShortcut({ altKey: true, ctrlKey: false, metaKey: false, code: 'KeyP' }), true);
  assert.equal(isPresenterShortcut({ altKey: true, ctrlKey: true, metaKey: false, code: 'KeyP' }), false);
  assert.equal(isPresenterShortcut({ altKey: false, ctrlKey: false, metaKey: false, code: 'KeyP' }), false);
});
test('timer formats minute boundaries and hours without wrapping', () => {
  assert.equal(formatElapsed(59999), '00:59');
  assert.equal(formatElapsed(60000), '01:00');
  assert.equal(formatElapsed(3600000), '60:00');
});
test('speaker notes map to slides without entering audience markup', async () => {
  const deck = await compileDeck('---\nnotes:\n  - Private first note\n  - Private second note\n---\n\n# First\n\n---\n\n# Second');
  assert.equal(deck.slides[0]?.notes, 'Private first note');
  assert.equal(deck.slides[1]?.notes, 'Private second note');
  assert.doesNotMatch(deck.slides[0]!.code, /children: "Private first note"/);
  await assert.rejects(compileDeck('---\nnotes: Invalid scalar\n---\n\n# Slide'), /array of strings/);
});

test('slide size defaults to 16:9, accepts custom ratios, and rejects invalid dimensions', async () => {
  const { resolveSlideSize } = await import('@mdx-slides/core');
  assert.deepEqual(resolveSlideSize(), { width: 1280, height: 720 });
  assert.deepEqual(resolveSlideSize({ width: 1920 }), { width: 1920, height: 1080 });
  assert.deepEqual(resolveSlideSize({ width: 1024, height: 768 }), { width: 1024, height: 768 });
  for (const size of [{ width: 0 }, { height: -1 }, { width: Infinity }, { width: '1920' }, null]) {
    assert.throws(() => resolveSlideSize(size), /positive/);
  }
});

test('canvas fitting preserves every edge in audience and presenter viewports', async () => {
  const { fitSlide } = await import('@mdx-slides/core');
  for (const canvas of [{ width: 1280, height: 720 }, { width: 1024, height: 768 }]) {
    for (const viewport of [{ width: 1920, height: 1080 }, { width: 326, height: 578 }, { width: 900, height: 480 }]) {
      const { scale, left, top } = fitSlide(viewport, canvas);
      assert.ok(left >= 0 && top >= 0);
      assert.ok(left + canvas.width * scale <= viewport.width + 1e-9);
      assert.ok(top + canvas.height * scale <= viewport.height + 1e-9);
      assert.equal(canvas.width * scale / (canvas.height * scale), canvas.width / canvas.height);
    }
  }
});
