import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiFetch } from '../../lib/api.js';

// SVG polygon points for the 5-pointed star
const STAR_PTS = '12,2.6 14.85,8.9 21.6,9.7 16.6,14.35 18,21.1 12,17.8 6,21.1 7.4,14.35 2.4,9.7 9.15,8.9';

function Star({ filled }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
      <polygon
        points={STAR_PTS}
        fill={filled ? 'var(--color-accent)' : 'none'}
        stroke={filled ? 'var(--color-accent)' : 'var(--color-text-tertiary)'}
        strokeWidth={filled ? '1.0' : '1.4'}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function OmenFeedback({ week, season, moveTitle, moveSubtext }) {
  const navigate = useNavigate();
  const [followed, setFollowed] = useState(null); // null | true | false
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  async function handleSubmit() {
    if (submitting || done) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiFetch('/api/omen/feedback', {
        method: 'POST',
        body: {
          followed,
          stars: stars > 0 ? stars : null,
          note: note.trim() || null,
          week,
          season,
        },
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login');
      } else {
        setSubmitError("Couldn't save. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Locked / done state ──────────────────────────────────────────────────
  if (done) {
    return (
      <div className="mt-8">
        <Connector gold />
        <div
          className="rounded-lg border p-6 text-center"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--color-accent)' }}
          >
            Locked in
          </p>
          <p
            className="mt-2 font-display text-xl font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Your answer is recorded.
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Corvus factors this in when Tuesday's scoring runs.
          </p>
        </div>
      </div>
    );
  }

  // ── Interactive state ────────────────────────────────────────────────────
  return (
    <div className="mt-8">
      <Connector gold={followed === true} />

      <div
        className="rounded-lg border p-6"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
      >
        {/* Eyebrow */}
        <p
          className="mb-5 text-center text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Outcome · Week {week ?? '—'}
        </p>

        {/* Heading — the most prominent element */}
        <h3
          className="mb-5 text-center font-display text-3xl font-semibold"
          style={{
            color: 'var(--color-text-primary)',
            lineHeight: 1.08,
            letterSpacing: '-0.005em',
          }}
        >
          Did you run it?
        </h3>

        {/* Yes / No */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <ChoiceButton
            active={followed === true}
            variant="yes"
            onClick={() => setFollowed(followed === true ? null : true)}
          >
            Yes
          </ChoiceButton>
          <ChoiceButton
            active={followed === false}
            variant="no"
            onClick={() => setFollowed(followed === false ? null : false)}
          >
            No
          </ChoiceButton>
        </div>

        <Divider />

        {/* Star rating */}
        <div className="mb-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              How right did it feel?
            </span>
            <span
              className="font-mono text-xs tabular-nums"
              style={{ color: stars > 0 ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}
            >
              {stars > 0 ? `${stars} / 5` : '—'}
            </span>
          </div>
          <div className="flex" role="group" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n !== 1 ? 's' : ''}`}
                aria-pressed={n <= stars}
                className="flex flex-1 items-center justify-center py-3 transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)] rounded-sm"
                onClick={() => setStars(stars === n ? 0 : n)}
              >
                <Star filled={n <= stars} />
              </button>
            ))}
          </div>
        </div>

        <Divider />

        {/* Note */}
        <div className="mb-7">
          <label
            htmlFor="omen-feedback-note"
            className="mb-2 block text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            What happened?
          </label>
          <input
            id="omen-feedback-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Injury, lineup change, trusted the Omen..."
            className="w-full min-h-[44px] bg-transparent pb-3 font-sans text-base outline-none transition-colors placeholder:italic"
            style={{
              color: 'var(--color-text-primary)',
              borderBottom: `1px solid ${note ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
          />
        </div>

        {/* Error */}
        {submitError && (
          <p className="mb-4 text-sm text-red-400" role="alert">
            {submitError}
          </p>
        )}

        {/* Submit */}
        <button
          type="button"
          aria-busy={submitting}
          disabled={submitting}
          onClick={handleSubmit}
          className="w-full rounded-md font-sans text-base font-semibold transition-all active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-text-on-accent)',
            padding: '13px',
          }}
        >
          {submitting ? 'Saving…' : 'Lock it in.'}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Connector({ gold }) {
  return (
    <div className="my-3 flex justify-center" aria-hidden="true">
      <div
        className="w-px transition-colors duration-300"
        style={{
          height: 22,
          background: gold ? 'var(--color-accent)' : 'var(--color-border)',
          opacity: gold ? 0.55 : 1,
        }}
      />
    </div>
  );
}

function Divider() {
  return (
    <div
      className="mb-5"
      style={{ height: 1, background: 'var(--color-border)' }}
    />
  );
}

function ChoiceButton({ children, active, variant, onClick }) {
  const isYes = variant === 'yes';

  const activeStyle = isYes
    ? { background: 'var(--color-accent)', color: 'var(--color-text-on-accent)', borderColor: 'var(--color-accent)' }
    : { background: 'rgba(182, 106, 106, 0.12)', color: '#B66A6A', borderColor: '#B66A6A' };

  const idleStyle = isYes
    ? { background: 'transparent', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }
    : { background: 'transparent', color: '#B66A6A', borderColor: 'rgba(182, 106, 106, 0.36)' };

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="h-12 rounded-md border font-sans text-lg font-semibold transition-colors active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]"
      style={active ? activeStyle : idleStyle}
    >
      {children}
    </button>
  );
}
