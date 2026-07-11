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

const TONE_STYLE = {
  neutral: { borderColor: 'var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)' },
  omen:    { borderColor: 'var(--color-team-accent)', background: 'var(--color-accent-muted)', color: 'var(--color-text-primary)' },
  risk:    { borderColor: 'var(--color-risk-high)', background: 'color-mix(in srgb, var(--color-risk-high) 12%, var(--color-surface-1))', color: 'var(--color-text-primary)' },
  success: { borderColor: 'rgba(52,199,89,0.3)', background: 'rgba(52,199,89,0.10)', color: 'var(--color-text-primary)' },
};

export function Alert({ tone = 'neutral', className = '', children, ...rest }) {
  const style = TONE_STYLE[tone] ?? TONE_STYLE.neutral;
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-xs ${className}`.trim()}
      style={style}
      data-alert-tone={tone}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Alert;
