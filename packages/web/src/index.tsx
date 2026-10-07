import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useDeck, resolveSlideSize, fitSlide } from '@mdx-slides/core';
import { DeckSlide, type DeckProps } from '@mdx-slides/strict-dom';
import { tokens } from '@mdx-slides/strict-dom/tokens.css';
import { html, css } from 'react-strict-dom';
import { formatElapsed, isPresenterShortcut } from './presentation.js';
export { formatElapsed, isPresenterShortcut } from './presentation.js';

const styles = css.create({
  stage: { display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: 16, gap: 16, height: '100dvh', minHeight: 0, overflow: 'hidden', backgroundColor: tokens.background, color: tokens.text },
  audience: { position: 'fixed', inset: 0, padding: 0, backgroundColor: tokens.surface, zIndex: 100 },
  header: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexShrink: 0 },
  title: { fontSize: 14, fontWeight: '700', letterSpacing: 2, color: tokens.muted },
  workspace: { display: 'flex', flexDirection: { default: 'row', '@media (max-width: 800px)': 'column' }, flexGrow: 1, minHeight: 0, gap: 16, overflow: 'auto' },
  current: { display: 'flex', flexDirection: 'column', flexGrow: 2, flexBasis: 0, minWidth: 0, minHeight: { default: 0, '@media (max-width: 800px)': 240 } },
  sidebar: { display: 'flex', flexDirection: 'column', gap: 16, flexGrow: 1, flexBasis: 0, minWidth: 0, minHeight: 0, overflow: 'auto' },
  viewport: { position: 'relative', width: '100%', overflow: 'hidden', backgroundColor: tokens.background, borderRadius: 0 },
  ratio: (width: number, height: number) => ({ aspectRatio: `${width} / ${height}` }),
  slideBackground: { backgroundColor: tokens.surface },
  fillViewport: { flexGrow: 1, flexShrink: 1, minHeight: 0, aspectRatio: 'auto' },
  canvas: (scale: number, left: number, top: number, width: number, height: number) => ({ position: 'absolute', width, height, boxSizing: 'border-box', transformOrigin: 'top left', transform: `translate(${left}px, ${top}px) scale(${scale})` }),
  controls: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  button: { padding: 12, backgroundColor: tokens.code, color: tokens.text, borderRadius: 0, cursor: 'pointer' },
  active: { backgroundColor: tokens.accent, color: tokens.accentText },
  panel: { padding: 20, borderRadius: 0, backgroundColor: tokens.surface, color: tokens.text },
  label: { marginTop: 0, marginBottom: 12, fontSize: 13, fontWeight: '700', color: tokens.muted, letterSpacing: 1 },
  notes: { whiteSpace: 'pre-wrap', fontSize: 16, lineHeight: 1.6, margin: 0 },
  clock: { fontFamily: 'monospace', fontSize: 36, marginBottom: 16 },
  hint: { fontSize: 12, color: tokens.muted },
});

function FitSlide({ fill = false, slideOnly = false, ...props }: Parameters<typeof DeckSlide>[0] & { fill?: boolean; slideOnly?: boolean }) {
  const dimensions = resolveSlideSize(props.size);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1280, height: 720 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const bounds = element.getBoundingClientRect();
      setSize({ width: bounds.width, height: bounds.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const { scale, left, top } = fitSlide(size, dimensions);
  return <html.div ref={ref} style={[styles.viewport, styles.ratio(dimensions.width, dimensions.height), fill && styles.fillViewport, slideOnly && styles.slideBackground]}>
    <html.div style={styles.canvas(scale, left, top, dimensions.width, dimensions.height)}>
      <DeckSlide {...props} />
    </html.div>
  </html.div>;
}

export interface WebDeckProps extends DeckProps { toolbar?: ReactNode; title?: string }
export function Deck({ slides, components, Frame, size, initialIndex = 0, toolbar, title = 'MDX SLIDES' }: WebDeckProps) {
  const { index, goTo, next, previous } = useDeck(slides.length, initialIndex);
  const [presenter, setPresenter] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [focus, setFocus] = useState(false);
  const slideOnly = fullscreen || focus;
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const accumulated = useRef(0);
  const started = useRef(0);
  useEffect(() => {
    if (!running) return;
    started.current = performance.now();
    const tick = () => setElapsed(accumulated.current + performance.now() - started.current);
    const interval = window.setInterval(tick, 250);
    return () => { accumulated.current += performance.now() - started.current; window.clearInterval(interval); };
  }, [running]);
  const togglePresenter = () => {
    if (slideOnly) return;
    setPresenter(value => !value);
    if (!presenter && elapsed === 0) setRunning(true);
  };
  const toggleFullscreen = async () => {
    setError('');
    if (fullscreen) {
      if (document.fullscreenElement) await document.exitFullscreen();
      setFullscreen(false);
      return;
    }
    // Always show only the audience slide in fullscreen, never notes or controls.
    setFullscreen(true);
    if (document.documentElement.requestFullscreen) {
      try { await document.documentElement.requestFullscreen(); }
      catch { setError('Browser fullscreen is unavailable. Slide-only mode is active; press Escape to exit.'); }
    }
  };
  useEffect(() => {
    const changed = () => { if (!document.fullscreenElement) setFullscreen(false); };
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]'))) return;
      if (isPresenterShortcut(event)) { event.preventDefault(); togglePresenter(); return; }
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === ' ' && event.target instanceof Element && event.target.closest('button, a')) return;
      if (event.key === 'Escape') { setFocus(false); setFullscreen(false); if (document.fullscreenElement) void document.exitFullscreen(); return; }
      if (event.code === 'KeyZ') { event.preventDefault(); if (!fullscreen) setFocus(value => !value); return; }
      if (event.code === 'KeyF') { event.preventDefault(); void toggleFullscreen(); return; }
      if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); next(); }
      if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); previous(); }
      if (event.key === 'Home') { event.preventDefault(); goTo(0); }
      if (event.key === 'End') { event.preventDefault(); goTo(Math.max(0, slides.length - 1)); }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  });
  const content = { slides, index, components, Frame, size };
  return <html.main style={[styles.stage, slideOnly && styles.audience]}>
    {!slideOnly && <html.header style={styles.header}>
      <html.span style={styles.title}>{title}</html.span>
      <html.div style={styles.controls}>
        {toolbar}
        <html.button style={[styles.button, presenter && styles.active]} aria-pressed={presenter} onClick={togglePresenter}>Presenter mode</html.button>
        <html.button style={styles.button} onClick={() => setFocus(true)}>Focus mode</html.button>
        <html.button style={styles.button} onClick={() => void toggleFullscreen()}>Full screen</html.button>
      </html.div>
    </html.header>}
    {slideOnly ? <FitSlide {...content} fill slideOnly /> : presenter ?
      <html.div style={styles.workspace}>
        <html.div style={styles.current}><FitSlide {...content} fill /></html.div>
        <html.aside aria-label="Presenter tools" style={styles.sidebar}>
          <html.div><html.h2 style={styles.label}>NEXT SLIDE</html.h2>
            {index + 1 < slides.length ? <FitSlide {...content} index={index + 1} /> : <html.p style={styles.panel}>End of deck</html.p>}
          </html.div>
          <html.div style={styles.panel}>
            <html.h2 style={styles.label}>PRESENTATION TIMER</html.h2>
            <html.div role="timer" style={styles.clock}>{formatElapsed(elapsed)}</html.div>
            <html.div style={styles.controls}>
              <html.button style={styles.button} onClick={() => setRunning(value => !value)}>{running ? 'Pause timer' : 'Start timer'}</html.button>
              <html.button style={styles.button} onClick={() => { accumulated.current = 0; started.current = performance.now(); setElapsed(0); }}>Reset timer</html.button>
            </html.div>
          </html.div>
          <html.div style={styles.panel}><html.h2 style={styles.label}>SPEAKER NOTES</html.h2>
            <html.p style={styles.notes}>{slides[index]?.notes || 'No notes for this slide.'}</html.p>
          </html.div>
        </html.aside>
      </html.div> : <FitSlide {...content} fill />}
    {!slideOnly && <html.nav aria-label="Slide navigation" style={styles.header}>
      <html.div style={styles.controls}>
        <html.button style={styles.button} onClick={previous} disabled={index === 0}>Previous</html.button>
        <html.span aria-live="polite">{slides.length ? index + 1 : 0} / {slides.length}</html.span>
        <html.button style={styles.button} onClick={next} disabled={index >= slides.length - 1}>Next</html.button>
      </html.div>
      <html.span style={styles.hint}>← → Navigate · Option/Alt + P Presenter · Z Focus · F Full screen · Esc Exit</html.span>
    </html.nav>}
    {!slideOnly && error && <html.p role="status">{error}</html.p>}
  </html.main>;
}
