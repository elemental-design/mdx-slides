declare module '*.mdx' {
  export const frontmatter: Record<string, unknown>;
  export const slides: import('@mdx-slides/core').Slide[];
  export default slides;
}
declare module '*.css';
