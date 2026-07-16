import React, { forwardRef, useId } from 'react';

const Textarea = forwardRef(function Textarea({
  size = 'md',
  state = 'default',
  leadingIcon,
  trailingIcon,
  label,
  hint,
  errorMessage,
  className = '',
  id,
  ...props
}, ref) {
  const generatedId = useId();
  const textareaId = id || generatedId;

  let sizeClasses = '';
  if (size === 'sm') {
    sizeClasses = 'min-h-[32px] p-3 text-sm';
  } else if (size === 'md') {
    sizeClasses = 'min-h-[40px] p-4 text-base';
  } else if (size === 'lg') {
    sizeClasses = 'min-h-[48px] p-5 text-lg';
  }

  const baseClasses = 'flex w-full rounded-md border bg-[var(--color-surface-1)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 resize-y';

  let stateClasses = '';
  if (state === 'error') {
    stateClasses = 'border-[var(--color-risk-high)] focus-visible:outline-[var(--color-risk-high)]';
  } else {
    stateClasses = 'border-[var(--color-border)] hover:border-[var(--color-border-hover,var(--color-border))] focus-visible:outline-[var(--color-accent)]';
  }

  const hasLeadingIcon = !!leadingIcon;
  const hasTrailingIcon = !!trailingIcon || state === 'success';

  if (hasLeadingIcon) {
    if (size === 'sm') sizeClasses = sizeClasses.replace('p-3', 'py-3 pr-3 pl-9');
    else if (size === 'md') sizeClasses = sizeClasses.replace('p-4', 'py-4 pr-4 pl-10');
    else if (size === 'lg') sizeClasses = sizeClasses.replace('p-5', 'py-5 pr-5 pl-12');
  }

  if (hasTrailingIcon) {
    if (size === 'sm') sizeClasses = sizeClasses.replace('p-3', 'py-3 pl-3 pr-9').replace('pr-3 pl-9', 'pl-9 pr-9');
    else if (size === 'md') sizeClasses = sizeClasses.replace('p-4', 'py-4 pl-4 pr-10').replace('pr-4 pl-10', 'pl-10 pr-10');
    else if (size === 'lg') sizeClasses = sizeClasses.replace('p-5', 'py-5 pl-5 pr-12').replace('pr-5 pl-12', 'pl-12 pr-12');
  }

  const combinedClasses = `${baseClasses} ${sizeClasses} ${stateClasses} ${className}`.trim().replace(/\s+/g, ' ');

  const renderTrailingIcon = () => {
    if (state === 'success') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--color-risk-low)]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    return trailingIcon;
  };

  const isError = state === 'error';
  const showErrorMessage = isError && errorMessage;
  const errorId = `${textareaId}-error`;
  const hintId = `${textareaId}-hint`;

  let ariaDescribedBy;
  if (showErrorMessage) {
    ariaDescribedBy = errorId;
  } else if (hint) {
    ariaDescribedBy = hintId;
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-[var(--color-text-primary)]">
          {label}
        </label>
      )}
      <div className="relative flex w-full">
        {hasLeadingIcon && (
          <div className="absolute top-3 left-3 flex items-center justify-center pointer-events-none text-[var(--color-text-secondary)]">
            {leadingIcon}
          </div>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={combinedClasses}
          aria-invalid={showErrorMessage ? 'true' : undefined}
          aria-describedby={ariaDescribedBy}
          {...props}
        />
        {hasTrailingIcon && (
          <div className="absolute top-3 right-3 flex items-center justify-center pointer-events-none text-[var(--color-text-secondary)]">
            {renderTrailingIcon()}
          </div>
        )}
      </div>
      {(hint || showErrorMessage) && (
        <div className="text-xs">
          {showErrorMessage ? (
            <span id={errorId} className="text-[var(--color-risk-high)]">{errorMessage}</span>
          ) : (
            <span id={hintId} className="text-[var(--color-text-secondary)]">{hint}</span>
          )}
        </div>
      )}
    </div>
  );
});

export default Textarea;
