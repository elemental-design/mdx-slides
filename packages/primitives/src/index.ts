import { Children, createElement, type ElementType, type ReactNode, type CSSProperties } from 'react';
import type { MDXComponents } from '@mdx-slides/core';
interface Props { children?: ReactNode; href?: string; src?: string; alt?: string }
type Styles = Record<string, CSSProperties>;
interface Primitives { View: ElementType; Text: ElementType; Image: ElementType }

// Works with React Native or react-designapp/figma's View, Text and Image.
export function createPrimitiveComponents({ View, Text, Image }: Primitives, { styles = {}, linkProps = () => ({}) }: { styles?: Styles; linkProps?: (href?: string) => Record<string, unknown> } = {}) {
  const text = (tag: string, defaults: CSSProperties = {}) => ({ children }: Props) => createElement(Text, {
    style: { ...defaults, ...styles[tag] },
  }, children);
  const block = (tag: string) => ({ children }: Props) => createElement(View, { style: styles[tag] }, children);
  const components: Record<string, (props: Props) => ReactNode> = {
    p: text('p', { fontSize: 24, marginBottom: 16 }),
    strong: text('strong', { fontWeight: 'bold' }), em: text('em', { fontStyle: 'italic' }),
    del: text('del', { textDecorationLine: 'line-through' }),
    code: text('code', { fontFamily: 'monospace' }), pre: block('pre'),
    blockquote: block('blockquote'), ul: block('ul'), ol: block('ol'),
    li: ({ children }) => createElement(View, { style: { marginBottom: 8, ...styles.li } },
      createElement(Text, null, '• '), ...Children.toArray(children).map((child, index) =>
        typeof child === 'string' || typeof child === 'number'
          ? createElement(Text, { key: index }, child) : child)),
    a: ({ href, children }) => createElement(Text, { ...linkProps(href), style: styles.a }, children),
    img: ({ src, alt }) => createElement(Image, { source: { uri: src }, accessibilityLabel: alt, style: styles.img }),
    hr: () => createElement(View, { style: { height: 1, backgroundColor: '#aaa', ...styles.hr } }),
    br: () => createElement(Text, null, '\n'),
  };
  for (let level = 1; level <= 6; level++) components[`h${level}`] = text(`h${level}`, {
    fontSize: 52 - level * 4, fontWeight: 'bold', marginBottom: 24,
  });
  return components as MDXComponents;
}
