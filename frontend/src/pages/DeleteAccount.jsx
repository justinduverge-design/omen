import { Link } from 'react-router';
import PublicInfoLayout, { InfoSection } from '../components/layout/PublicInfoLayout.jsx';

export default function DeleteAccount() {
  return (
    <PublicInfoLayout eyebrow="Account data" title="Delete your Omen data" updatedAt="August 2, 2026">
      <p>
        Deletion is available from your authenticated Omen account. This public page explains the live product flow; it
        does not collect account details or credentials.
      </p>

      <InfoSection title="What deletion does">
        <p>
          The account deletion flow removes Omen-stored platform connections and credentials, saved moves, consent
          records, profile data, and your Omen authentication identity, then signs the browser out. It does not delete
          information held by a fantasy platform or delete your separate Google, Discord, Yahoo, Sleeper, or ESPN account.
        </p>
        <p>
          Omen may retain limited non-personal audit records for compliance accountability. Platform data held by third
          parties remains subject to their own deletion and retention practices.
        </p>
        <p>Waitlist signup data is separate. Use the waitlist unsubscribe page if you also want that email removed.</p>
        <Link className="inline-flex min-h-[44px] items-center font-semibold text-[var(--color-accent)] underline underline-offset-4" to="/unsubscribe">
          Leave the waitlist
        </Link>
      </InfoSection>

      <InfoSection title="How to delete your data">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Sign in to Omen.</li>
          <li>Open Account.</li>
          <li>Select Delete data in the Omen Data section and complete the confirmation step.</li>
        </ol>
        <Link className="inline-flex min-h-[44px] items-center font-semibold text-[var(--color-accent)] underline underline-offset-4" to="/account">
          Go to Account
        </Link>
      </InfoSection>

      <InfoSection title="Need help first?">
        <p>Review the support page before deleting data if you only need to reconnect a platform or resolve an account-access issue.</p>
        <Link className="inline-flex min-h-[44px] items-center font-semibold text-[var(--color-accent)] underline underline-offset-4" to="/support">
          Visit Support
        </Link>
      </InfoSection>
    </PublicInfoLayout>
  );
}
