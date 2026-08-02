import { useState } from 'react';
import PublicInfoLayout, { InfoSection } from '../components/layout/PublicInfoLayout.jsx';
import { apiFetch } from '../lib/api.js';

export default function Unsubscribe() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const result = await apiFetch('/api/waitlist', {
        method: 'DELETE',
        body: { email },
      });
      setStatus('success');
      setMessage(result.message);
      setEmail('');
    } catch (_) {
      setStatus('error');
      setMessage('We could not process that request. Please try again or email privacy@slopssaloon.com.');
    }
  }

  return (
    <PublicInfoLayout eyebrow="Email choices" title="Leave the Omen waitlist" updatedAt="August 2, 2026">
      <p>Enter the email address you used for the Omen waitlist. You do not need an Omen account.</p>
      <InfoSection title="Unsubscribe">
        <form className="max-w-md space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2" htmlFor="unsubscribe-email">
            <span className="font-semibold">Email address</span>
            <input
              id="unsubscribe-email"
              autoComplete="email"
              className="min-h-[48px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button
            className="min-h-[48px] rounded-lg bg-[var(--color-accent)] px-5 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
            disabled={status === 'loading'}
            type="submit"
          >
            {status === 'loading' ? 'Removing…' : 'Remove me from the waitlist'}
          </button>
        </form>
        {message && (
          <p className={status === 'error' ? 'text-red-400' : ''} role="status">{message}</p>
        )}
      </InfoSection>
      <InfoSection title="Need help?">
        <p>
          Email <a className="font-semibold text-[var(--color-accent)] underline underline-offset-4" href="mailto:privacy@slopssaloon.com">privacy@slopssaloon.com</a> from the address you want removed.
        </p>
      </InfoSection>
    </PublicInfoLayout>
  );
}
