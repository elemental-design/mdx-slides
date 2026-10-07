// A build-time alias for react-strict-dom. It deliberately keeps styles uncompiled.
import { Children, createContext, isValidElement, useContext, type ReactNode, type ComponentProps } from 'react';
import { View, Text, Image, Link, Svg, Path } from '@react-pdf/renderer';
import { resolve } from 'node:path';
type Style = NonNullable<ComponentProps<typeof View>['style']>;

type RawStyle = Record<string, unknown>;
type Props = { children?: ReactNode; style?: unknown; src?: string; href?: string; start?: number };
const defaults: Record<string, unknown> = {};
let group = 0;
let assetBase = process.cwd();
const inlineComponents = new Set<unknown>();
export function configurePDF(base: string, components: unknown[] = []) {
  assetBase = base;
  components.forEach(component => inlineComponents.add(component));
}
export const css = {
  create: <T,>(styles: T): T => styles,
  defineVars: (values: RawStyle) => {
    const id = group++;
    return Object.fromEntries(Object.entries(values).map(([key, value]) => {
      const variable = `var(--pdf-${id}-${key})`;
      defaults[variable] = value;
      return [key, variable];
    }));
  },
  createTheme: (variables: Record<string, string>, values: RawStyle) => ({
    $theme: Object.fromEntries(Object.entries(values).map(([key, value]) => [variables[key], value])),
  }),
  defineConsts: <T,>(values: T): T => values,
};
const ListContext = createContext<string | undefined>(undefined);
const Context = createContext<{ palette: RawStyle; text: RawStyle }>({ palette: {}, text: {} });
const textKeys = ['color', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'textAlign', 'textDecoration'];
const ignored = new Set(['cursor', 'boxSizing', 'whiteSpace', 'minHeight', 'maxWidth', 'aspectRatio', 'transformOrigin', 'zIndex']);
function flatten(value: unknown): RawStyle {
  if (Array.isArray(value)) return Object.assign({}, ...value.map(flatten));
  return value && typeof value === 'object' ? value as RawStyle : {};
}
function normalize(raw: RawStyle, palette: RawStyle): RawStyle {
  const result: RawStyle = {};
  for (const [key, original] of Object.entries(raw)) {
    if (ignored.has(key) || key === '$theme' || key.startsWith(':') || key.startsWith('@')) continue;
    let value = original;
    if (value && typeof value === 'object') value = (value as RawStyle).default;
    if (typeof value === 'string' && value.startsWith('var(')) value = palette[value] ?? defaults[value];
    if (key === 'fontWeight' && typeof value === 'string' && /^\d+$/.test(value)) value = Number(value);
    if (key === 'fontFamily' && value === 'monospace') value = 'Courier';
    if (value !== undefined) result[key] = value;
  }
  return result;
}
function groupText(children: ReactNode, text: RawStyle): ReactNode[] {
  const result: ReactNode[] = [];
  let run: ReactNode[] = [];
  const flush = () => { if (run.length) { result.push(<Text key={`text-${result.length}`} style={text as Style}>{run}</Text>); run = []; } };
  for (const child of Children.toArray(children)) {
    const inline = typeof child === 'string' || typeof child === 'number' ||
      (isValidElement(child) && inlineComponents.has(child.type));
    if (inline) run.push(child);
    else { flush(); result.push(child); }
  }
  flush();
  return result;
}
function host(tag: string) {
  const inline = ['h1','h2','h3','h4','h5','h6','p','span','strong','em','del','code','a','label'].includes(tag);
  return function PDFElement({ children, style, src, href, start }: Props) {
    const parent = useContext(Context);
    const marker = useContext(ListContext);
    const raw = flatten(style);
    const palette = { ...parent.palette, ...flatten(raw.$theme) };
    const semantic: RawStyle = tag === 'strong' ? { fontWeight: 700 } : tag === 'em' ? { fontStyle: 'italic' } : tag === 'del' ? { textDecoration: 'line-through' } : {};
    const resolved = normalize({ ...semantic, ...raw }, palette);
    const text = { ...parent.text, ...Object.fromEntries(textKeys.filter(key => key in resolved).map(key => [key, resolved[key]])) };
    const context = { palette, text };
    if (tag === 'img') {
      if (!src) throw new Error('PDF images require a src');
      const source = /^(https?:|data:)/.test(src) ? src : resolve(assetBase, src);
      return <Image src={source} style={resolved as Style} />;
    }
    if (tag === 'br') return <Text>{'\n'}</Text>;
    if (tag === 'span' && children === '◆') {
      return <View style={resolved as Style}><Svg width={14} height={14} viewBox="0 0 14 14"><Path d="M7 0 L14 7 L7 14 L0 7 Z" fill={String(text.color ?? '#000000')} /></Svg></View>;
    }
    if (tag === 'span' && resolved.display === 'flex') {
      return <View style={resolved as Style}><Text style={text as Style}>{children}</Text></View>;
    }
    if (inline) {
      return <Context.Provider value={context}>{tag === 'a'
        ? <Link src={href} style={{ ...parent.text, ...resolved } as Style}>{children}</Link>
        : <Text style={{ ...parent.text, ...resolved } as Style}>{children}</Text>}</Context.Provider>;
    }
    let kids = groupText(children, text);
    if (tag === 'ul' || tag === 'ol') {
      kids = Children.toArray(children).map((child, index) =>
        <ListContext.Provider key={index} value={tag === 'ol' ? `${(start ?? 1) + index}.` : '•'}>{child}</ListContext.Provider>);
    }
    if (tag === 'li' && resolved.flexDirection !== 'row') {
      return <Context.Provider value={context}><View style={{ ...resolved, flexDirection: 'row', gap: 12 } as Style}>
        <Text style={text as Style}>{marker ?? '•'}</Text><View style={{ flexGrow: 1, flexBasis: 0 }}>{kids}</View>
      </View></Context.Provider>;
    }
    return <Context.Provider value={context}><View style={resolved as Style}>{kids}</View></Context.Provider>;
  };
}
export const html = Object.fromEntries([
  'div','main','section','article','header','footer','aside','nav','h1','h2','h3','h4','h5','h6',
  'p','span','strong','em','del','code','pre','blockquote','ul','ol','li','a','img','hr','br','label',
].map(tag => [tag, host(tag)]));

for (const tag of ['strong', 'em', 'del', 'code', 'a', 'br']) inlineComponents.add(html[tag]);
