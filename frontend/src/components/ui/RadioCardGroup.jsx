import React, { createContext, useContext, useRef, useId } from 'react';

const RadioCardGroupContext = createContext();

const RadioCardGroup = ({
  value,
  onValueChange,
  className = '',
  'aria-label': ariaLabel,
  children,
  ...props
}) => {
  const name = useId();
  const containerRef = useRef(null);

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
    <RadioCardGroupContext.Provider value={{ selectedValue: value, onChange: onValueChange, name }}>
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label={ariaLabel}
        className={`flex flex-col gap-3 ${className}`}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </div>
    </RadioCardGroupContext.Provider>
  );
};

const RadioCardGroupItem = ({ value, title, description, disabled = false, className = '', ...props }) => {
  const { selectedValue, onChange, name } = useContext(RadioCardGroupContext);
  const isSelected = selectedValue === value;
  const id = useId();

  const baseClasses = `
    relative flex flex-col items-start rounded-xl p-4 transition-colors duration-150 ease-in-out motion-reduce:transition-none motion-reduce:duration-0 cursor-pointer text-left
  `;

  // We use border-2 on both to prevent layout shift.
  const stateClasses = isSelected
    ? 'border-2 border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)]'
    : 'border-2 border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] hover:border-[var(--color-border)]';

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  const combinedClasses = `${baseClasses} ${stateClasses} ${disabledClasses} ${className}`.trim().replace(/\s+/g, ' ');

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
      <div className="flex w-full items-start justify-between gap-3 mb-1">
        <span className="text-base font-semibold text-[var(--color-text-primary)]">
          {title}
        </span>
        <div className={`mt-0.5 flex shrink-0 items-center justify-center w-5 h-5 rounded-full border ${isSelected ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-text-on-accent)]' : 'border-[var(--color-border)] bg-transparent'}`}>
          {isSelected && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="4" />
            </svg>
          )}
        </div>
      </div>
      {description && (
        <span className="text-sm text-[var(--color-text-secondary)]">
          {description}
        </span>
      )}
    </label>
  );
};

RadioCardGroup.Item = RadioCardGroupItem;

export default RadioCardGroup;
