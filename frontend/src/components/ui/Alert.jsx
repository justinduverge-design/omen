/**
 * Alert.jsx — inline banner-style notice (component-lock-v1.md §4.1).
 *
 * Sibling to Card: same tone/variant vocabulary, but shaped for full-width
 * status strips and notices, not panel content. Found while migrating pages
 * to Card — several "border + surface-1, rounded-lg, px-4 py-3" boxes
 * (Football.jsx's platform-status bar, ConnectLeague.jsx's ESPN cookie
 * guide) don't fit Card's locked 24px interior/header/body/footer shape at
 * all; they're this component instead.
 */

// 'neutral' and 'risk' backgrounds are surface-1-based (the resolved card
// fill), so their text needs the same card/shell text-color split Card.jsx
// uses -- see that file's `cardTextScope` for the full rationale. 'omen'
// (accent-muted) and 'success' (fixed rgba) backgrounds are independent of
// the resolved card fill and stay on the shell's own fixed text colors.
const CARD_SCOPED_TEXT_VARS = {
  '--color-text-secondary': 'var(--color-card-text-secondary, var(--color-text-secondary))',
  '--color-text-primary': 'var(--color-card-text-primary, var(--color-text-primary))',
};

const TONE_STYLE = {
  neutral: { borderColor: 'var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', ...CARD_SCOPED_TEXT_VARS },
  omen:    { borderColor: 'var(--color-team-accent)', background: 'var(--color-accent-muted)', color: 'var(--color-text-primary)' },
  risk:    { borderColor: 'var(--color-risk-high)', background: 'color-mix(in srgb, var(--color-risk-high) 12%, var(--color-surface-1))', color: 'var(--color-text-primary)', ...CARD_SCOPED_TEXT_VARS },
  success: { borderColor: 'rgba(52,199,89,0.3)', background: 'rgba(52,199,89,0.10)', color: 'var(--color-text-primary)' },
};

export function Alert({ tone = 'neutral', className = '', style: styleOverride, children, ...rest }) {
  const toneStyle = TONE_STYLE[tone] ?? TONE_STYLE.neutral;
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-xs ${className}`.trim()}
      style={{ ...toneStyle, ...styleOverride }}
      data-alert-tone={tone}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Alert;
