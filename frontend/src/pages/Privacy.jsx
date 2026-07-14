import { Link } from 'react-router-dom';
import PublicInfoLayout, { InfoSection } from '../components/layout/PublicInfoLayout.jsx';

export default function Privacy() {
  return (
    <PublicInfoLayout eyebrow="Privacy" title="Privacy Policy" updatedAt="July 13, 2026">
      <p>
        This page explains the information Omen processes to provide fantasy-football tools. It is a product disclosure,
        not legal advice. Omen is free and does not use Stripe or another payment provider for this product.
      </p>

      <InfoSection title="Information we process">
        <p>
          When you create an account, Omen processes account and profile information. When you connect a fantasy
          platform, Omen may process platform identifiers, display names, league and team identifiers, roster and
          standings information, draft and matchup metadata, player information, and recommendation history.
        </p>
        <p>We use this information to provide connection status, recommendations, standings, move history, and draft assistance.</p>
      </InfoSection>

      <InfoSection title="Platform credentials and data">
        <p>
          Yahoo access and refresh tokens, and any ESPN session cookies you choose to provide, are treated as sensitive
          credentials. Omen stores them through Supabase Vault references rather than plaintext application columns. We
          do not display them back to you, include them in analytics, or share them with other users.
        </p>
        <p>
          Sleeper connections use the username, user identifier, and selected league and team identifiers needed for
          Omen&apos;s read-only product features. Current Sleeper integrations do not require a Sleeper password or private token.
        </p>
      </InfoSection>

      <InfoSection title="How long we keep information">
        <p>
          Omen keeps account, connection, and related fantasy-football information only for product operation, security,
          support, recommendation history, and deletion or audit needs. Some data is short-lived or refreshed for
          reliability, rate-limit protection, and data freshness. We do not publish fixed retention windows for every
          category yet; that schedule remains an open policy item.
        </p>
      </InfoSection>

      <InfoSection title="Sharing and AI processing">
        <p>
          Omen does not sell fantasy-platform data or share reusable platform credentials with other users. Omen may use
          hosting, database, storage, logging, analytics, and security providers needed to operate the product. When Omen
          calls a connected platform on your behalf, relevant data is sent to that platform.
        </p>
        <p>
          Omen may use AI systems to create plain-English recommendation explanations. Omen does not send platform
          credentials, Vault identifiers, or authorization headers to those systems. If cloud AI processing is approved in
          the future, this policy will be updated before that change applies to user or platform data.
        </p>
      </InfoSection>

      <InfoSection title="Your choices">
        <p>You can disconnect a supported platform where the product provides that control. You can also request account deletion from Omen.</p>
        <Link className="inline-flex min-h-[44px] items-center font-semibold text-[var(--color-accent)] underline underline-offset-4" to="/delete-account">
          Learn how to delete your account data
        </Link>
        <p>
          For a privacy question, contact{' '}
          <a className="font-semibold text-[var(--color-accent)] underline underline-offset-4" href="mailto:privacy@slopssaloon.com">privacy@slopssaloon.com</a>.
        </p>
      </InfoSection>

      <InfoSection title="Platform attribution">
        <p>Platform trademarks belong to their respective owners. Omen is not endorsed by or affiliated with Yahoo, Sleeper, ESPN, Disney, or the NFL.</p>
      </InfoSection>
    </PublicInfoLayout>
  );
}
