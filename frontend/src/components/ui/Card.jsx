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
        <span
          className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.10em]"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
        >
          Preview
        </span>
      )}
      {children}
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
