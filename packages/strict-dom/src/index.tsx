import { createElement, type ComponentProps, type ComponentType, type ReactNode } from 'react';
import { css, html } from 'react-strict-dom';
import { SlideContent, useDeck, resolveSlideSize, type SlideSize, type MDXComponents, type SlideContentProps } from '@mdx-slides/core';

import { tokens } from './tokens.css.js';
export { Theme, lightTheme, darkTheme, tokens } from './themes.js';

const styles = css.create({
  stage: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24, gap: 24, backgroundColor: tokens.background, minHeight: '100%' },
  slide: { boxSizing: 'border-box', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 1280, minHeight: 720, height: 720, padding: 64, backgroundColor: tokens.surface, color: tokens.text, borderRadius: 0 },
  dimensions: (width: number, height: number) => ({ width, maxWidth: width, height, minHeight: height, boxSizing: 'border-box' }),
  heading: { fontSize: 48, fontWeight: '700', marginTop: 0, marginBottom: 24 },
  subheading: { fontSize: 36, fontWeight: '700', marginTop: 0, marginBottom: 20 },
  paragraph: { fontSize: 24, lineHeight: 1.5, marginTop: 0, marginBottom: 16 },
  list: { fontSize: 24, marginTop: 0, marginBottom: 16, paddingLeft: 32 },
  item: { fontSize: 24, marginBottom: 8 },
  code: { fontFamily: 'monospace', fontSize: 22 },
  pre: { padding: 20, backgroundColor: tokens.background, borderRadius: 0, marginBottom: 16 },
  row: { display: 'flex', flexDirection: 'row', gap: 24, alignItems: 'center' },
  column: { display: 'flex', flexDirection: 'column', gap: 24, flexGrow: 1, flexBasis: 0 },
  controls: { display: 'flex', flexDirection: 'row', gap: 24, alignItems: 'center', color: tokens.text },
  button: { padding: 12, backgroundColor: tokens.accent, color: tokens.background, borderRadius: 0 },
});

export const markdownComponents: MDXComponents = {
  h1: props => <html.h1 {...props} style={styles.heading} />,
  h2: props => <html.h2 {...props} style={styles.subheading} />,
  h3: props => <html.h3 {...props} style={styles.subheading} />,
  h4: html.h4, h5: html.h5, h6: html.h6,
  p: props => <html.p {...props} style={styles.paragraph} />,
  ul: props => <html.ul {...props} style={styles.list} />,
  ol: props => <html.ol {...props} style={styles.list} />,
  li: props => <html.li {...props} style={styles.item} />,
  pre: props => <html.pre {...props} style={styles.pre} />,
  code: props => <html.code {...props} style={styles.code} />,
  a: html.a, strong: html.strong, em: html.em, del: html.del,
  blockquote: html.blockquote, img: html.img, hr: html.hr, br: html.br,
};

/** Inject a compatible html implementation for existing custom consumers. */
export function createStrictDOMComponents(host: typeof html): MDXComponents {
  const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'strong', 'em', 'del', 'blockquote', 'ul', 'ol', 'li', 'pre', 'code', 'img', 'hr', 'br'] as const;
  return Object.fromEntries(tags.map(tag => {
    if (!host[tag]) throw new Error(`Strict DOM adapter is missing html.${tag}`);
    return [tag, host[tag]];
  })) as MDXComponents;
}
export function Row({ children }: { children?: ReactNode }) {
  return <html.div style={styles.row}>{children}</html.div>;
}
export function Column({ children }: { children?: ReactNode }) {
  return <html.div style={styles.column}>{children}</html.div>;
}
export const defaultComponents: MDXComponents = { ...markdownComponents, Row, Column };
export type SlideProps = ComponentProps<typeof html.div>;
export function Slide({ children, style, ...props }: SlideProps) {
  return <html.div {...props} style={[styles.slide, style]}>{children}</html.div>;
}
export interface DeckSlideProps extends SlideContentProps { Frame?: ComponentType<SlideProps>; size?: Partial<SlideSize> }
export function DeckSlide({ components, Frame = Slide, size, ...props }: DeckSlideProps) {
  const dimensions = resolveSlideSize(size);
  return <Frame style={styles.dimensions(dimensions.width, dimensions.height)} aria-label={props.slides[props.index ?? 0]?.title}>
    <SlideContent {...props} components={{ ...defaultComponents, ...components }} />
  </Frame>;
}
export interface DeckProps extends Omit<DeckSlideProps, 'index'> { initialIndex?: number }
/** Portable player: buttons and layout work on web and native; keyboard input is a host concern. */
export function Deck({ slides, components, Frame, size, initialIndex = 0 }: DeckProps) {
  const { index, next, previous } = useDeck(slides.length, initialIndex);
  return <html.div data-layoutconformance="strict" style={styles.stage}>
    <DeckSlide slides={slides} index={index} components={components} Frame={Frame} size={size} />
    <html.div style={styles.controls}>
      <html.button style={styles.button} onClick={previous} disabled={index === 0}>Previous</html.button>
      <html.span aria-live="polite">{slides.length ? index + 1 : 0} / {slides.length}</html.span>
      <html.button style={styles.button} onClick={next} disabled={index >= slides.length - 1}>Next</html.button>
    </html.div>
  </html.div>;
}
