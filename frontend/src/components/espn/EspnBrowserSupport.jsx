/**
 * Where ESPN connect actually works, stated plainly.
 *
 * There are two paths and they have different browser support, which is the single most
 * confusing thing about connecting ESPN. Saying "use a desktop browser" is not enough:
 *
 *  - **The extension** reads the cookies for you. It needs browser-level cookie access, so it
 *    is Chrome and Edge on a computer only. **Safari cannot do this even on a Mac** — Apple
 *    does not let Safari extensions read HttpOnly cookies, on macOS or iOS. Confirmed on a
 *    real iPhone 2026-08-15: every read came back empty with permission granted.
 *  - **The manual path** uses the browser's own developer tools, which *can* show HttpOnly
 *    cookies. That works in any desktop browser, Safari and Firefox included.
 *  - **No phone browser can do either.** Chrome has no extensions on phones, Safari's
 *    extensions hit the limitation above, and no mobile browser ships developer tools.
 *
 * Deliberately no third-party browser logos: they are trademarks, we have no licensed assets,
 * and an approximated logo looks worse than clean type. Support status is carried by an
 * accessible mark plus words, not by colour or an icon alone.
 */

const SUPPORT = [
  {
    id: 'chrome-edge',
    level: 'yes',
    name: 'Chrome or Edge, on a computer',
    detail: 'Easiest. Install the Omen helper and it fills the form for you.',
  },
  {
    id: 'other-desktop',
    level: 'manual',
    name: 'Safari or Firefox, on a computer',
    detail: 'Works, but you copy the two values yourself using the browser’s developer tools. The Omen helper cannot run here.',
  },
  {
    id: 'phone',
    level: 'no',
    name: 'Any phone or tablet browser',
    detail: 'Not possible yet — phone browsers can’t reach the values ESPN requires. Use a computer for this one step.',
  },
];

const MARKS = {
  yes: { glyph: '✓', label: 'Supported', color: 'var(--color-success, #15803d)' },
  manual: { glyph: '~', label: 'Works manually', color: 'var(--color-warning, #b45309)' },
  no: { glyph: '✕', label: 'Not supported', color: 'var(--color-danger, #b91c1c)' },
};

export default function EspnBrowserSupport({ storeLinks = true }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="espn-browser-support-heading">
      <h3
        id="espn-browser-support-heading"
        className="text-sm font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Where this works
      </h3>

      <ul className="flex flex-col gap-2.5">
        {SUPPORT.map((row) => {
          const mark = MARKS[row.level];
          return (
            <li key={row.id} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ color: mark.color, border: `1px solid ${mark.color}` }}
              >
                {mark.glyph}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {/* The status word is repeated in text so it is never conveyed by colour alone. */}
                  <span className="sr-only">{mark.label}: </span>
                  {row.name}
                </p>
                <p className="text-xs leading-5" style={{ color: 'var(--color-text-secondary)' }}>
                  {row.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {storeLinks && (
        <p className="text-xs leading-5" style={{ color: 'var(--color-text-tertiary)' }}>
          Get the helper for{' '}
          <a
            className="underline"
            style={{ color: 'var(--color-accent)' }}
            href="https://chromewebstore.google.com/detail/omen-espn-connect/odfoahekibbfjipnofmfenabnnlgfljm"
            target="_blank"
            rel="noreferrer"
          >
            Chrome
          </a>{' '}
          or{' '}
          <a
            className="underline"
            style={{ color: 'var(--color-accent)' }}
            href="https://microsoftedge.microsoft.com/addons/detail/omen-espn-connect/nkcbgdhpekbclicgcfbokjmcgkhfhddl"
            target="_blank"
            rel="noreferrer"
          >
            Edge
          </a>
          . It only reads espn.com, and you always press Connect yourself.
        </p>
      )}
    </section>
  );
}
