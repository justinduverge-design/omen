/**
 * Stepper.jsx — linear progress-dot indicator (decorative chrome, not an
 * interactive control — sibling to Alert/Card in that sense, not to
 * TabNav/SegmentedControl, which own selection state).
 *
 * Extracted from Onboarding.jsx's inline StepDots — same visual contract
 * (the current step renders wide + accent-colored, done/current steps stay
 * accent-colored, upcoming steps stay border-colored), promoted here
 * because "N-step flow" is a recurring pattern rather than something
 * specific to onboarding.
 */
const Stepper = ({ step, count, className = '', 'aria-label': ariaLabel, ...props }) => {
  return (
    <div
      role="progressbar"
      aria-valuenow={step + 1}
      aria-valuemin={1}
      aria-valuemax={count}
      aria-label={ariaLabel}
      className={`flex items-center justify-center gap-2 ${className}`.trim()}
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none motion-reduce:duration-0"
          style={{
            width: i === step ? 24 : 8,
            background: i <= step ? 'var(--color-accent)' : 'var(--color-border)',
          }}
        />
      ))}
    </div>
  );
};

export default Stepper;
