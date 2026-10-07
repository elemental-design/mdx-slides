export function formatElapsed(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function isPresenterShortcut(event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'code'>): boolean {
  // Option+P produces “π” on macOS; physical key code is intentional.
  return event.altKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyP';
}
