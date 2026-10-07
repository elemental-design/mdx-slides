import { css, type StyleVars } from 'react-strict-dom';
type Palette = Readonly<{ background: string; surface: string; text: string; muted: string; accent: string; accentText: string; line: string; code: string }>;
export const tokens: StyleVars<Palette> = css.defineVars({
  background: '#eef0f4', surface: '#ffffff', text: '#182232', muted: '#647082',
  accent: '#3957dc', accentText: '#ffffff', line: '#d8deea', code: '#edf1fa',
});
