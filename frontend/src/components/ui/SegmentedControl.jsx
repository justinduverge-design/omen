import React, { createContext, useContext, useId, useRef } from 'react';

const SegmentedControlContext = createContext();

const SegmentedControl = ({
  value,
  onValueChange,
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
  children,
  ...props
}) => {
  const name = useId();
  const containerRef = useRef(null);

  let sizeClasses = 'h-9 text-sm';
  if (size === 'sm') sizeClasses = 'h-7 text-xs';
  if (size === 'lg') sizeClasses = 'h-11 text-base';

  const handleKeyDown = (e) => {
    if (!containerRef.current) return;
    const isArrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
    if (!isArrow) return;

    const radios = Array.from(
      containerRef.current.querySelectorAll('input[type="radio"]:not([disabled])')
    );
    if (radios.length === 0) return;

    const currentIndex = radios.findIndex((radio) => radio === document.activeElement);
    if (currentIndex === -1) return;

    e.preventDefault();
    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = currentIndex === radios.length - 1 ? 0 : currentIndex + 1;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = currentIndex === 0 ? radios.length - 1 : currentIndex - 1;
    }

    const nextRadio = radios[nextIndex];
    nextRadio.focus();
    nextRadio.click();
  };

  return (
    <SegmentedControlContext.Provider value={{ selectedValue: value, onChange: onValueChange, sizeClasses, name }}>
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-1 p-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] ${className}`}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </div>
    </SegmentedControlContext.Provider>
  );
};

const SegmentedControlItem = ({ value, children, disabled = false, className = '', ...props }) => {
  const { selectedValue, onChange, sizeClasses, name } = useContext(SegmentedControlContext);
  const isSelected = selectedValue === value;
  const id = useId();

  const baseClasses = `
    relative flex items-center justify-center rounded-md font-medium transition-colors duration-150 ease-in-out motion-reduce:transition-none motion-reduce:duration-0
    cursor-pointer px-3
  `;

  const stateClasses = isSelected
    ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)] border border-[var(--color-accent)]'
    : 'bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]';

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  const combinedClasses = `${baseClasses} ${sizeClasses} ${stateClasses} ${disabledClasses} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <label
      htmlFor={id}
      className={`${combinedClasses} has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-accent)]`}
      {...props}
    >
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={isSelected}
        onChange={(e) => {
          if (onChange && e.target.checked) {
            onChange(value);
          }
        }}
        disabled={disabled}
        className="sr-only peer"
      />
      <span className="z-10 truncate">{children}</span>
    </label>
  );
};

SegmentedControl.Item = SegmentedControlItem;

export default SegmentedControl;
