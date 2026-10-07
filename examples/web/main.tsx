import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Deck } from '@mdx-slides/web';
import { resolveSlideSize } from '@mdx-slides/core';
import { Theme } from '@mdx-slides/strict-dom';
import { ExampleFrame, exampleComponents, ThemeButton } from './theme.js';
import slides, { frontmatter } from './deck.mdx';
import './style.css';
function App() {
  const [mode, setMode] = useState<'light' | 'dark'>(() => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  return <Theme mode={mode}><Deck size={resolveSlideSize(frontmatter.size)} slides={slides} title="STUDIO / MDX SLIDES" Frame={ExampleFrame} components={exampleComponents}
    toolbar={<ThemeButton dark={mode === 'dark'} onClick={() => setMode(value => value === 'light' ? 'dark' : 'light')} />} /></Theme>;
}
createRoot(document.getElementById('root')!).render(<App />);
