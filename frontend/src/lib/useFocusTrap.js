import { useEffect } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Traps Tab/Shift+Tab focus cycling inside `containerRef` while `active` is
// true, for open modal dialogs (nav drawer, help panel).
//
// Every Tab keypress is intercepted and focus is moved manually via
// `.focus()` rather than left to native traversal. This isn't just
// wrap-at-the-edges: macOS Safari's default keyboard mode (without "Full
// Keyboard Access") excludes plain <button>/<a> elements from the native Tab
// order unless they carry an explicit tabindex attribute, so letting native
// Tab handle any step inside the container -- not only the first/last --
// lets focus jump straight out to background content. Programmatic .focus()
// bypasses that restriction entirely, so driving every hop ourselves is what
// makes the trap hold in Safari as well as Chromium/Firefox. Confirmed via
// real Safari WebDriver testing, phase 1.13 mobile QA sweep, 2026-07-03.
export function useFocusTrap(containerRef, active) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    function handleKeyDown(e) {
      if (e.key !== 'Tab') return;
      const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;

      e.preventDefault();

      const currentIndex = focusable.indexOf(document.activeElement);
      let nextIndex;
      if (e.shiftKey) {
        nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
      } else {
        nextIndex = currentIndex === -1 || currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
      }
      focusable[nextIndex].focus();
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, active]);
}
