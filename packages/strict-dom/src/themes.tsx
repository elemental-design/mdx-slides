import { css, html, type StyleTheme } from 'react-strict-dom';
import type { ReactNode, ComponentProps } from 'react';
import { tokens } from './tokens.css.js';
export { tokens } from './tokens.css.js';
export const lightTheme: StyleTheme<typeof tokens, symbol> = css.createTheme(tokens, {
  background: '#eef0f4', surface: '#ffffff', text: '#182232', muted: '#647082',
  accent: '#3957dc', accentText: '#ffffff', line: '#d8deea', code: '#edf1fa',
});
export const darkTheme: StyleTheme<typeof tokens, symbol> = css.createTheme(tokens, {
  background: '#0d111a', surface: '#171e2d', text: '#edf1fa', muted: '#a0adc2',
  accent: '#b1c0ff', accentText: '#182232', line: '#313d53', code: '#222e43',
});
const styles = css.create({ root: { minHeight: '100%', backgroundColor: tokens.background, color: tokens.text } });
export function Theme({ mode = 'light', children }: { mode?: 'light' | 'dark'; children?: ReactNode }) {
  // Strict DOM 0.0.55's Theme type is narrower than its documented style contract.
  const theme = (mode === 'dark' ? darkTheme : lightTheme) as unknown as NonNullable<ComponentProps<typeof html.div>['style']>;
  return <html.div style={[styles.root, theme]}>{children}</html.div>;
}
