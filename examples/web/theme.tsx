import { css, html } from 'react-strict-dom';
import { Slide, type SlideProps } from '@mdx-slides/strict-dom';
import { tokens } from '@mdx-slides/strict-dom/tokens.css';
import { Children, createContext, useContext, type ReactNode } from 'react';
import type { MDXComponents } from '@mdx-slides/core';

const styles = css.create({
  frame: { height: 720, minHeight: 720, padding: 72, borderRadius: 0, backgroundColor: tokens.surface, color: tokens.text, justifyContent: 'center' },
  heading: { fontSize: 72, fontWeight: '700', letterSpacing: -3, lineHeight: 1.1, marginTop: 0, marginBottom: 28, maxWidth: 1000 },
  subheading: { fontSize: 40, fontWeight: '700', marginTop: 0, marginBottom: 24 },
  paragraph: { fontSize: 28, lineHeight: 1.5, color: tokens.muted, marginTop: 0, marginBottom: 24 },
  accent: { color: tokens.accent },
  eyebrow: { color: tokens.accent, fontSize: 16, letterSpacing: 3, fontWeight: '700', marginBottom: 24 },
  list: { display: 'flex', flexDirection: 'column', gap: 20, padding: 0, margin: 0 },
  item: { display: 'flex', flexDirection: 'row', gap: 20, alignItems: 'flex-start', fontSize: 28, lineHeight: 1.5 },
  marker: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, flexShrink: 0, borderRadius: 0, backgroundColor: tokens.accent, color: tokens.accentText, fontSize: 22, fontWeight: '700' },
  body: { flexGrow: 1, flexBasis: 0 },
  columns: { display: 'flex', flexDirection: 'row', gap: 40, alignItems: 'stretch' },
  card: { display: 'flex', flexDirection: 'column', flexGrow: 1, flexBasis: 0, padding: 32, backgroundColor: tokens.code, borderRadius: 0 },
  stat: { fontSize: 80, fontWeight: '700', letterSpacing: -4, color: tokens.accent, marginBottom: 12 },
  quote: { borderLeftWidth: 6, borderLeftStyle: 'solid', borderLeftColor: tokens.accent, paddingLeft: 32, margin: 0, fontSize: 36, lineHeight: 1.4 },
  pre: { backgroundColor: tokens.code, padding: 28, borderRadius: 0, marginTop: 0, marginBottom: 20 },
  code: { fontFamily: 'monospace', fontSize: 22, color: tokens.text },
  button: { backgroundColor: tokens.code, color: tokens.text, padding: 12, borderRadius: 0, cursor: 'pointer' },
});

export function ExampleFrame(props: SlideProps) { return <Slide {...props} style={[styles.frame, props.style]} />; }
export function ThemeButton({ dark, onClick }: { dark: boolean; onClick: () => void }) {
  return <html.button style={styles.button} onClick={onClick} aria-pressed={dark}>{dark ? 'Light mode' : 'Dark mode'}</html.button>;
}
const Marker = createContext('◆');
function List({ children, ordered = false }: { children?: ReactNode; ordered?: boolean }) {
  const items = Children.toArray(children);
  const Tag = ordered ? html.ol : html.ul;
  return <Tag style={styles.list}>{items.map((child, index) =>
    <Marker.Provider key={index} value={ordered ? String(index + 1).padStart(2, '0') : '◆'}>{child}</Marker.Provider>)}</Tag>;
}
function Bullet({ children }: { children?: ReactNode }) {
  const marker = useContext(Marker);
  return <html.li style={styles.item}><html.span aria-hidden={true} style={styles.marker}>{marker}</html.span><html.div style={styles.body}>{children}</html.div></html.li>;
}
export const exampleComponents: MDXComponents = {
  h1: props => <html.h1 {...props} style={styles.heading} />,
  h2: props => <html.h2 {...props} style={styles.subheading} />,
  p: props => <html.p {...props} style={styles.paragraph} />,
  strong: props => <html.strong {...props} style={styles.accent} />,
  ul: props => <List {...props} />, ol: props => <List {...props} ordered />,
  li: Bullet,
  blockquote: props => <html.blockquote {...props} style={styles.quote} />,
  pre: props => <html.pre {...props} style={styles.pre} />,
  code: props => <html.code {...props} style={styles.code} />,
  Heading: ({ children }) => <html.h2 style={styles.subheading}>{children}</html.h2>,
  Body: ({ children }) => <html.p style={styles.paragraph}>{children}</html.p>,
  Eyebrow: ({ children }) => <html.div style={styles.eyebrow}>{children}</html.div>,
  Columns: ({ children }) => <html.div style={styles.columns}>{children}</html.div>,
  Card: ({ children }) => <html.div style={styles.card}>{children}</html.div>,
  Stat: ({ children }) => <html.div style={styles.stat}>{children}</html.div>,
};
