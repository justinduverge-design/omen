import { Link } from 'react-router-dom';
import PublicInfoLayout, { InfoSection } from '../components/layout/PublicInfoLayout.jsx';

export default function Support() {
  return (
    <PublicInfoLayout eyebrow="Support" title="Get help with Omen" updatedAt="July 13, 2026">
      <p>
        Use the options below to recover account access, manage a connected platform, or understand how Omen handles
        your data. Do not send platform cookies, OAuth tokens, authentication headers, or screenshots containing them to any support channel.
      </p>

      <InfoSection title="Account and connection help">
        <p>Sign in to manage platform connections and account data. If a platform needs to be reconnected, use the Account page rather than sharing credentials elsewhere.</p>
        <Link className="inline-flex min-h-[44px] items-center font-semibold text-[var(--color-accent)] underline underline-offset-4" to="/account">
          Open Account
        </Link>
      </InfoSection>

      <InfoSection title="Privacy and deletion">
        <p>Read the privacy policy for the information Omen processes, or use the account deletion guide to remove Omen-stored account data.</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link className="inline-flex min-h-[44px] items-center font-semibold text-[var(--color-accent)] underline underline-offset-4" to="/privacy">Privacy Policy</Link>
          <Link className="inline-flex min-h-[44px] items-center font-semibold text-[var(--color-accent)] underline underline-offset-4" to="/delete-account">Delete account data</Link>
        </div>
      </InfoSection>

      <InfoSection title="Contact channel">
        <p>
          For account or product help, contact{' '}
          <a className="font-semibold text-[var(--color-accent)] underline underline-offset-4" href="mailto:support@slopssaloon.com">support@slopssaloon.com</a>.
          {' '}Do not include platform cookies, OAuth tokens, authentication headers, or screenshots containing them.
        </p>
      </InfoSection>
    </PublicInfoLayout>
  );
}
