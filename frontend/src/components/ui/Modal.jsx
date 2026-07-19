import { useEffect, useId, useRef } from 'react';
import { useFocusTrap } from '../../lib/useFocusTrap.js';

/**
 * Modal.jsx — canonical dialog shell (compound-component shape following
 * Card: header rendered from props, Modal.Body / Modal.Footer sub-sections
 * own their own padding).
 *
 * Promoted near-verbatim from Account.jsx's hand-built delete-confirmation
 * dialog — the real production a11y logic (focus trap via lib/useFocusTrap,
 * ESC-to-close, body scroll lock, role="dialog"/aria-modal, responsive
 * bottom-sheet → centered) is preserved, not reinvented. Account.jsx is the
 * reference consumer.
 *
 * The panel carries no padding; Modal renders the header and the consumer
 * composes Modal.Body / Modal.Footer (optionally inside a <form> for
 * Enter-to-submit, as the delete dialog does).
 *
 * Props:
 *  - open, onClose            open state + close handler
 *  - title, eyebrow           standardized header; header is omitted if no title
 *  - eyebrowTone              'risk' | 'accent' | 'neutral' (default 'neutral')
 *  - closeDisabled            suppress ESC / backdrop / close-button while true (e.g. submitting)
 *  - closeOnBackdrop          default true
 *  - size                     'sm' | 'md' | 'lg' (max-width; default 'md')
 *  - initialFocusRef          element focused on open (defaults to the panel)
 *  - aria-labelledby / -describedby   pass-through; labelledby auto-wires to the title if omitted
 */

const SIZE_MAX_WIDTH = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

const EYEBROW_TONE_COLOR = {
  risk: 'var(--color-risk-high)',
  accent: 'var(--color-team-accent)',
  neutral: 'var(--color-text-tertiary)',
};

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  eyebrowTone = 'neutral',
  closeDisabled = false,
  closeOnBackdrop = true,
  size = 'md',
  initialFocusRef,
  className = '',
  children,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...rest
}) {
  const panelRef = useRef(null);
  const generatedTitleId = useId();
  const titleId = ariaLabelledBy || (title ? generatedTitleId : undefined);

  useFocusTrap(panelRef, open);

  // Body scroll lock + initial focus while open.
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Defer focus a tick so the panel is mounted and laid out.
    const focusId = window.setTimeout(() => {
      (initialFocusRef?.current ?? panelRef.current)?.focus();
    }, 50);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusId);
    };
  }, [open, initialFocusRef]);

  // ESC-to-close (suppressed while closeDisabled, e.g. mid-submit).
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape' && !closeDisabled) onClose?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose, closeDisabled]);

  if (!open) return null;

  const maxWidth = SIZE_MAX_WIDTH[size] ?? SIZE_MAX_WIDTH.md;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(10, 10, 11, 0.6)' }}
        onClick={closeOnBackdrop && !closeDisabled ? onClose : undefined}
      />
      <div className="fixed inset-0 z-50 flex items-end justify-center px-4 py-4 sm:items-center">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={ariaDescribedBy}
          tabIndex={-1}
          className={`w-full ${maxWidth} rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-2xl focus:outline-none ${className}`.trim().replace(/\s+/g, ' ')}
          {...rest}
        >
          {title && (
            <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
              <div>
                {eyebrow && (
                  <p
                    className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: EYEBROW_TONE_COLOR[eyebrowTone] ?? EYEBROW_TONE_COLOR.neutral }}
                  >
                    {eyebrow}
                  </p>
                )}
                <h3 id={titleId} className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                disabled={closeDisabled}
                onClick={onClose}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-colors duration-150 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-team-accent)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </>
  );
}

Modal.Body = function ModalBody({ className = '', children, ...rest }) {
  return (
    <div className={`px-5 pb-5 ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
};

Modal.Footer = function ModalFooter({ className = '', children, ...rest }) {
  return (
    <div
      className={`flex flex-col-reverse gap-3 px-5 pb-5 pt-4 sm:flex-row sm:justify-end ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Modal;
