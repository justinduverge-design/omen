import React, { forwardRef } from 'react';

const Button = forwardRef(function Button({
  variant = 'primary',
  size = 'md',
  tone = 'accent',
  leadingIcon,
  trailingIcon,
  loading = false,
  disabled = false,
  asChild = false,
  className = '',
  style = {},
  children,
  onClick,
  ...props
}, ref) {
  const isLinkVariant = variant === 'link';
  const isDisabled = disabled || loading;

  let sizeClasses = '';
  if (!isLinkVariant) {
    if (size === 'sm') sizeClasses = 'h-7 px-3 text-xs';
    else if (size === 'md') sizeClasses = 'h-9 px-4 text-sm';
    else if (size === 'lg') sizeClasses = 'h-11 px-5 text-base';
  } else {
    if (size === 'sm') sizeClasses = 'text-xs';
    else if (size === 'md') sizeClasses = 'text-sm';
    else if (size === 'lg') sizeClasses = 'text-base';
  }

  const focusRing = tone === 'omen'
    ? 'focus-visible:outline-[var(--color-omen)]'
    : 'focus-visible:outline-[var(--color-accent)]';

  const disabledClasses = isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  let variantClasses = '';
  if (variant === 'primary') {
    if (tone === 'omen') {
      variantClasses = 'bg-[var(--color-omen)] text-[var(--color-text-on-accent)] hover:opacity-90 border border-transparent rounded-md';
    } else {
      variantClasses = 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)] hover:bg-[var(--color-accent-hover)] border border-transparent rounded-md';
    }
  } else if (variant === 'secondary') {
    if (tone === 'omen') {
      variantClasses = 'bg-transparent text-[var(--color-omen)] border border-[var(--color-omen)] hover:bg-[color-mix(in_srgb,var(--color-omen)_10%,transparent)] rounded-md';
    } else {
      variantClasses = 'bg-transparent text-[var(--color-accent)] border border-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] rounded-md';
    }
  } else if (variant === 'tertiary') {
    if (tone === 'omen') {
      variantClasses = 'bg-transparent text-[var(--color-omen)] hover:bg-[color-mix(in_srgb,var(--color-omen)_10%,transparent)] rounded-md border border-transparent';
    } else {
      variantClasses = 'bg-transparent text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] rounded-md border border-transparent';
    }
  } else if (variant === 'danger') {
    variantClasses = 'bg-[var(--color-risk-high)] text-white hover:opacity-90 border border-transparent rounded-md';
  } else if (variant === 'link') {
    variantClasses = 'bg-transparent hover:underline p-0 border-transparent';
    if (tone === 'omen') {
      variantClasses += ' text-[var(--color-omen)]';
    } else {
      variantClasses += ' text-[var(--color-accent)]';
    }
  }

  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

  const combinedClasses = `${baseClasses} ${sizeClasses} ${focusRing} ${disabledClasses} ${variantClasses} ${className}`.trim().replace(/\s+/g, ' ');

  const handleClick = (e) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  const renderTrailingIcon = () => {
    if (loading) {
      return (
        <span className="inline-flex items-center shrink-0">
          <svg
            className="animate-spin h-4 w-4 motion-reduce:hidden"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="hidden motion-reduce:inline-block font-bold" aria-hidden="true">...</span>
        </span>
      );
    }
    if (trailingIcon) {
      return <span className="inline-flex items-center shrink-0">{trailingIcon}</span>;
    }
    return null;
  };

  const renderLeadingIcon = () => {
    if (leadingIcon) {
      return <span className="inline-flex items-center shrink-0">{leadingIcon}</span>;
    }
    return null;
  };

  if (asChild) {
    if (!React.isValidElement(children)) {
      console.warn('Button with asChild requires a single valid React element child.');
      return null;
    }
    const child = React.Children.only(children);
    return React.cloneElement(child, {
      ref,
      className: `${combinedClasses} ${child.props.className || ''}`.trim(),
      style: { ...style, ...child.props.style },
      onClick: (e) => {
        if (isDisabled) {
          e.preventDefault();
          return;
        }
        if (child.props.onClick) child.props.onClick(e);
        if (onClick) onClick(e);
      },
      ...(isDisabled && (child.type === 'a' || child.props.to || child.props.href) ? { 'aria-disabled': true, tabIndex: -1 } : {}),
      ...(isDisabled && child.type !== 'a' && !child.props.to && !child.props.href ? { disabled: true, 'aria-disabled': true } : {}),
      ...props,
      children: (
        <>
          {renderLeadingIcon()}
          {child.props.children}
          {renderTrailingIcon()}
        </>
      )
    });
  }

  return (
    <button
      ref={ref}
      type="button"
      className={combinedClasses}
      style={style}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      onClick={handleClick}
      {...props}
    >
      {renderLeadingIcon()}
      {children}
      {renderTrailingIcon()}
    </button>
  );
});

export default Button;
