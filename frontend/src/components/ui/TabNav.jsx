import React, { createContext, useContext, useRef, useId } from 'react';

const TabNavContext = createContext();

const TabNav = ({
  value,
  onValueChange,
  className = '',
  'aria-label': ariaLabel,
  ...props
}) => {
  const containerRef = useRef(null);

  const handleKeyDown = (e) => {
    if (!containerRef.current) return;
    const isArrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
    if (!isArrow) return;

    const tabs = Array.from(
      containerRef.current.querySelectorAll('[role="tab"]:not([disabled])')
    );
    if (tabs.length === 0) return;

    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
    if (currentIndex === -1) return;

    e.preventDefault();
    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
    }

    const nextTab = tabs[nextIndex];
    nextTab.focus();
    nextTab.click();
  };

  return (
    <TabNavContext.Provider value={{ selectedValue: value, onChange: onValueChange }}>
      <div
        ref={containerRef}
        role="tablist"
        aria-label={ariaLabel}
        className={`flex items-center gap-6 border-b border-[var(--color-border)] ${className}`}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {props.children}
      </div>
    </TabNavContext.Provider>
  );
};

const TabNavItem = ({ value, children, disabled = false, className = '', ...props }) => {
  const { selectedValue, onChange } = useContext(TabNavContext);
  const isSelected = selectedValue === value;
  const id = useId();

  const baseClasses = `
    relative flex items-center justify-center font-medium transition-colors duration-150 ease-in-out
    cursor-pointer pb-3 pt-3 min-h-[44px] whitespace-nowrap
    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]
  `;

  // Underline tab chrome
  const stateClasses = isSelected
    ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] -mb-[1px]'
    : 'text-[var(--color-text-secondary)] border-b-2 border-transparent hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-subtle)] -mb-[1px]';

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  const combinedClasses = `${baseClasses} ${stateClasses} ${disabledClasses} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={isSelected}
      tabIndex={isSelected || (!selectedValue && value === undefined) ? 0 : -1}
      onClick={() => {
        if (!disabled && onChange) {
          onChange(value);
        }
      }}
      disabled={disabled}
      className={combinedClasses}
      {...props}
    >
      {children}
    </button>
  );
};

TabNav.Item = TabNavItem;

export default TabNav;
