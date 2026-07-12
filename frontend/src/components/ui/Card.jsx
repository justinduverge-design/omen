/**
 * Card.jsx — canonical Card shell primitive (component-lock-v1.md §4).
 *
 * Hand-built against existing CSS custom properties rather than adopting
 * shadcn/Radix in this PR — that's a separate dependency decision, not
 * bundled into "build the primitive." The exported API matches the spec's
 * canonical shape so a later migration to a shadcn-backed Card is a
 * drop-in swap, not a callsite rewrite.
 *
 * Spacing rhythm (component-lock-v1.md §6): 24px card interior, 16px
 * header-to-body, 24px body-to-footer.
 */

const VARIANT_CLASSES = {
  solid:    'border',
  outlined: 'border bg-transparent',
  empty:    'border border-dashed bg-transparent',
  error:    'border',
  preview:  'border relative',
};

// `preview` is intentionally included even though its base fill is
// transparent by default -- callers of the preview variant (e.g. the
// Appearance LivePreview) universally override `background` to the
// resolved team card fill, so its text should read against the card, not
// the shell. `outlined`/`empty` stay shell-scoped: their background really
// is transparent (the shell shows through), so shell-fixed text is correct.
const CARD_SURFACE_VARIANTS = new Set(['solid', 'preview', 'error']);

function variantStyle(variant) {
  switch (variant) {
    case 'outlined':
    case 'preview':
      return { borderColor: 'var(--color-border)', background: 'transparent' };
    case 'empty':
      return { borderColor: 'var(--color-border)', background: 'transparent' };
    case 'error':
      return {
        borderColor: 'var(--color-risk-high)',
        background: 'color-mix(in srgb, var(--color-risk-high) 12%, var(--color-surface-1))',
        color: 'var(--color-text-primary)',
      };
    case 'solid':
    default:
      return { borderColor: 'var(--color-border-subtle)', background: 'var(--color-surface-1)' };
  }
}

/**
 * Card/shell text-color split (founder decision 2026-07-12): the resolved
 * card fill can legitimately need different text than the shell (that's
 * what makes light Omen-neutral cards viable for saturated dark shells).
 * Redefining `--color-text-secondary`/`-primary` here, scoped to this DOM
 * subtree via ordinary CSS custom-property cascade, means every existing
 * `var(--color-text-secondary)` reference already written by pages that
 * render children inside a Card (Standings, DraftAssistant, Account,
 * Onboarding, Appearance) picks up the correct card-local value with zero
 * changes to those files -- this is the actual smallest fix, not a
 * per-page migration. The `var(--color-card-text-secondary, ...)` fallback
 * means an unthemed/system-mode render (before JS applies team tokens, or
 * outside team mode entirely) still resolves correctly, since index.css
 * defines `--color-card-text-*` defaults equal to the shell's own values.
 */
function cardTextScope(variant) {
  if (!CARD_SURFACE_VARIANTS.has(variant)) return {};
  return {
    '--color-text-secondary': 'var(--color-card-text-secondary, var(--color-text-secondary))',
    '--color-text-primary': 'var(--color-card-text-primary, var(--color-text-primary))',
  };
}

export function Card({ variant = 'solid', tone = 'neutral', className = '', style: styleOverride, children, ...rest }) {
  const base = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.solid;
  return (
    <div
      className={`rounded-xl ${base} ${className}`.trim()}
      style={{ ...variantStyle(variant), ...styleOverride }}
      data-card-variant={variant}
      data-card-tone={tone}
      {...rest}
    >
      {variant === 'preview' && (
        // Sits on --color-surface-2 (still shell-tinted), NOT the resolved
        // card fill -- deliberately outside the cardTextScope wrapper below
        // so it keeps the shell's own text color instead of the card's.
        <span
          className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.10em]"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
        >
          Preview
        </span>
      )}
      {/* `display: contents` keeps this wrapper invisible to layout (no
          box, no effect on Card.Header/Body/Footer spacing) while still
          scoping the card/shell text-color split via CSS cascade to
          everything that's actually rendered on the resolved card fill. */}
      <div style={{ display: 'contents', ...cardTextScope(variant) }}>
        {children}
      </div>
    </div>
  );
}

Card.Header = function CardHeader({ eyebrow, title, trailing, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-3 px-6 pt-6 pb-4 ${className}`.trim()}>
      <div>
        {eyebrow && (
          <p
            className="mb-1 text-xs font-medium uppercase tracking-[0.12em]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {eyebrow}
          </p>
        )}
        {title && (
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h3>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
};

Card.Body = function CardBody({ className = '', children }) {
  return <div className={`px-6 pb-6 ${className}`.trim()}>{children}</div>;
};

Card.Footer = function CardFooter({ className = '', children }) {
  return (
    <div
      className={`px-6 pb-6 pt-6 border-t ${className}`.trim()}
      style={{ borderColor: 'var(--color-border-subtle)' }}
    >
      {children}
    </div>
  );
};

export default Card;
