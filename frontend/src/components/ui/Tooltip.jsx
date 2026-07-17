import React, { useState, useRef, useEffect, useId } from 'react';

const Tooltip = ({
  children,
  content,
  side = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);
  const tooltipId = useId();

  const handleShow = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 150);
  };

  const handleHide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isVisible) {
      handleHide();
      // Keep focus on the trigger so keyboard users don't lose their place.
      if (triggerRef.current) {
         triggerRef.current.focus();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Determine positioning classes
  const getSideClasses = () => {
    switch (side) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  const child = React.Children.only(children);
  const trigger = React.cloneElement(child, {
    ref: (node) => {
      triggerRef.current = node;
      // Also pass down the ref if the child already has one. This can be complex depending on React version,
      // but standard is to just assign to our ref. We'll stick to a simple ref assignment for now.
    },
    tabIndex: child.props.tabIndex !== undefined ? child.props.tabIndex : 0,
    onMouseEnter: (e) => {
      handleShow();
      if (child.props.onMouseEnter) child.props.onMouseEnter(e);
    },
    onMouseLeave: (e) => {
      handleHide();
      if (child.props.onMouseLeave) child.props.onMouseLeave(e);
    },
    onFocus: (e) => {
      handleShow();
      if (child.props.onFocus) child.props.onFocus(e);
    },
    onBlur: (e) => {
      handleHide();
      if (child.props.onBlur) child.props.onBlur(e);
    },
    onKeyDown: (e) => {
      handleKeyDown(e);
      if (child.props.onKeyDown) child.props.onKeyDown(e);
    },
    'aria-describedby': isVisible ? tooltipId : child.props['aria-describedby'],
  });

  return (
    <div className="relative inline-block" onMouseLeave={handleHide}>
      {trigger}
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute z-50 px-2 py-1 text-sm rounded shadow-sm whitespace-nowrap pointer-events-none transition-opacity duration-150 motion-reduce:transition-none motion-reduce:duration-0 opacity-100 ${getSideClasses()}`}
          style={{
            backgroundColor: 'var(--color-surface-3)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)'
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
