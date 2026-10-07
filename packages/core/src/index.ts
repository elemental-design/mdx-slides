import { createElement, useCallback, useState, type ComponentType, type ElementType, type ReactNode } from 'react';
import type { MDXComponents } from 'mdx/types.js';

export type { MDXComponents } from 'mdx/types.js';
export interface Slide { id: string; title: string; notes?: string; Content: ComponentType<{ components?: MDXComponents }> }
export interface SlideContentProps { slides: readonly Slide[]; index?: number; components?: MDXComponents }
export interface FrameProps { id: string; name: string; children?: ReactNode }
export interface DeckFramesProps { slides: readonly Slide[]; Frame: ElementType<FrameProps>; components?: MDXComponents; frameProps?: Record<string, unknown> }

export function clampIndex(index: number, count: number): number {
  if (!Number.isInteger(index)) throw new TypeError('Slide index must be an integer');
  if (!Number.isInteger(count) || count < 0) throw new TypeError('Slide count must be a non-negative integer');
  return Math.max(0, Math.min(index, Math.max(0, count - 1)));
}
export function useDeck(count: number, initialIndex = 0) {
  const [index, setIndex] = useState(() => clampIndex(initialIndex, count));
  const goTo = useCallback((value: number) => setIndex(clampIndex(value, count)), [count]);
  const current = clampIndex(index, count);
  return { index: current, count, goTo, next: () => goTo(current + 1), previous: () => goTo(current - 1) };
}
export function SlideContent({ slides, index = 0, components = {} }: SlideContentProps) {
  const slide = slides[clampIndex(index, slides.length)];
  return slide ? createElement(slide.Content, { components }) : null;
}
export function DeckFrames({ slides, Frame, components = {}, frameProps = {} }: DeckFramesProps) {
  return slides.map(slide => createElement(Frame, {
    ...frameProps, key: slide.id, id: slide.id, name: slide.title,
  }, createElement(slide.Content, { components })));
}

export interface SlideSize { width: number; height: number }
export const DEFAULT_SLIDE_SIZE: Readonly<SlideSize> = Object.freeze({ width: 1280, height: 720 });
/** Logical slide dimensions; omitted height follows the default 16:9 ratio. */
export function resolveSlideSize(value?: unknown): SlideSize {
  if (value === undefined) return { ...DEFAULT_SLIDE_SIZE };
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Slide size must be an object with positive width and height');
  const { width = DEFAULT_SLIDE_SIZE.width, height = Number(width) * 9 / 16 } = value as Partial<SlideSize>;
  if (typeof width !== 'number' || typeof height !== 'number' || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new TypeError('Slide dimensions must be positive numbers');
  }
  return { width, height };
}
/** Contain the entire logical canvas, with centered letterboxing instead of cropping. */
export function fitSlide(viewport: SlideSize, canvas: SlideSize) {
  const scale = Math.max(0, Math.min(viewport.width / canvas.width, viewport.height / canvas.height));
  return { scale, left: (viewport.width - canvas.width * scale) / 2, top: (viewport.height - canvas.height * scale) / 2 };
}
