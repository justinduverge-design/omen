import { Link } from 'react-router';
import PublicInfoLayout, { InfoSection } from '../components/layout/PublicInfoLayout.jsx';

const COMPANY = 'Valor Ventures Limited Liability Company';

export default function Privacy() {
  return (
    <PublicInfoLayout eyebrow="Privacy" title="Privacy Notice" updatedAt="August 2, 2026">
      <p>
        Effective August 2, 2026. {COMPANY} (&quot;Valor Ventures,&quot; &quot;we,&quot; or &quot;us&quot;) operates Omen.
        This notice explains how Omen collects, uses, discloses, and retains personal information through its websites,
        applications, waitlist, and fantasy-football features.
      </p>

      <InfoSection title="Information we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Account information:</strong> email address, authentication identifier, display name, and account timestamps.</li>
          <li><strong>Fantasy-platform information:</strong> platform identifiers, usernames, selected leagues and teams, rosters, standings, matchups, drafts, transactions, players, and related metadata.</li>
          <li><strong>Connection credentials:</strong> OAuth tokens and, when you choose ESPN connection, ESPN session-cookie values needed to attempt that connection.</li>
          <li><strong>Omen activity:</strong> recommendations, saved moves, consent records, connection status, and feature interactions.</li>
          <li><strong>Device and diagnostic information:</strong> IP address, user agent, request details, security events, and error or performance data.</li>
          <li><strong>Communications:</strong> waitlist email and platform preference, plus information you send to support.</li>
        </ul>
        <p>
          We receive this information from you, your sign-in provider, connected fantasy platforms, and your use of Omen.
          Omen does not request your Sleeper password.
        </p>
      </InfoSection>

      <InfoSection title="How we use information">
        <p>
          We use information to authenticate you; connect the leagues you select; provide rosters, standings,
          recommendations, and history; operate the waitlist; respond to requests; secure, debug, and improve
          Omen; enforce our Terms; and meet legal obligations.
        </p>
        <p>
          Omen&apos;s recommendation engine is local by default. Omen does not currently send user or fantasy-platform data
          to a cloud AI provider. We will update this notice before materially changing that practice.
        </p>
      </InfoSection>

      <InfoSection title="Credentials and connected platforms">
        <p>
          Yahoo tokens and ESPN session-cookie values are sensitive credentials. Omen stores references to them through
          Supabase Vault rather than in plaintext application columns, does not display them back to you, and does not
          include them in analytics. Connected-platform data is used only for the Omen features you request and remains
          subject to that platform&apos;s terms and privacy practices.
        </p>
      </InfoSection>

      <InfoSection title="When we disclose information">
        <p>We may disclose the minimum information needed to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Supabase for authentication, database, and credential-vault services;</li>
          <li>Sentry, when configured, for scrubbed application error monitoring;</li>
          <li>Resend for Omen waitlist email;</li>
          <li>Google or Discord when you choose that sign-in method, and Google for hosted fonts;</li>
          <li>Yahoo, Sleeper, ESPN, or another fantasy platform when you request a connection or data refresh;</li>
          <li>hosting, security, professional, or government recipients when reasonably necessary to operate Omen, protect rights and safety, complete a business transaction, or comply with law.</li>
        </ul>
        <p>
          Omen does not sell personal information, share it for cross-context behavioral advertising, or use it for
          targeted advertising. Omen does not disclose reusable fantasy-platform credentials to other users.
        </p>
      </InfoSection>

      <InfoSection title="Retention">
        <ul className="list-disc space-y-2 pl-5">
          <li>Account, connection, recommendation, and consent records are generally kept while your account is active and removed when you complete account deletion, subject to limited records described below.</li>
          <li>Connection credentials are kept until you disconnect, they expire or are replaced, or you delete your account.</li>
          <li>Yahoo API response caches expire within 24 hours; Omen&apos;s current operational cache windows are shorter.</li>
          <li>Waitlist information is kept until you unsubscribe, ask us to remove it, or the list is retired.</li>
          <li>Public trade-share snapshots automatically expire after 30 days.</li>
          <li>Application logs are size-rotated. Sentry retains diagnostic information under its configured service settings.</li>
          <li>A one-way account hash may be retained only as reasonably needed to document a deletion request, prevent abuse, and protect Omen.</li>
        </ul>
        <p>Where a fixed period does not apply, we use the shortest period reasonably needed for the purpose described above.</p>
      </InfoSection>

      <InfoSection title="Cookies, local storage, and tracking preferences">
        <p>
          Omen and its authentication providers use browser storage and similar technologies for sessions, security,
          preferences, and product operation. Omen does not currently respond differently to browser Do Not Track signals
          because there is no accepted technical standard, and Omen does not track users across unaffiliated sites for
          behavioral advertising. Global Privacy Control signals are treated consistently with our no-sale and no-targeted-advertising practices.
        </p>
        <p>
          Service providers may receive technical information such as your IP address when their authentication, font,
          or diagnostic resources load. We do not permit them to use Omen personal information for cross-site behavioral advertising.
        </p>
      </InfoSection>

      <InfoSection title="Your choices and privacy requests">
        <p>
          You may disconnect supported platforms, export Omen account data, correct certain information by reconnecting
          or contacting us, and delete your Omen account. Account deletion removes the Omen profile, product records,
          stored connection credentials, and Omen authentication identity; it does not delete information held by a
          fantasy platform or a separate identity-provider account.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link className="inline-flex min-h-[44px] items-center font-semibold text-[var(--color-accent)] underline underline-offset-4" to="/delete-account">Delete your Omen data</Link>
          <Link className="inline-flex min-h-[44px] items-center font-semibold text-[var(--color-accent)] underline underline-offset-4" to="/unsubscribe">Leave the waitlist</Link>
        </div>
        <p>
          You may also ask to access, correct, or delete personal information by emailing{' '}
          <a className="font-semibold text-[var(--color-accent)] underline underline-offset-4" href="mailto:privacy@slopssaloon.com">privacy@slopssaloon.com</a>.
          We may verify your identity before completing a request and will not discriminate against you for exercising a privacy right.
        </p>
      </InfoSection>

      <InfoSection title="Children">
        <p>
          Omen is for people age 13 and older. We do not knowingly collect personal information from children under 13.
          If you believe a child under 13 provided information to Omen, contact us so we can investigate and delete it.
          Users under the age of legal majority must have permission from a parent or legal guardian.
        </p>
      </InfoSection>

      <InfoSection title="Security and international processing">
        <p>
          We use administrative, technical, and organizational safeguards designed to protect information, but no system
          is perfectly secure. Omen and its service providers may process information in the United States and other
          places where they operate, subject to applicable safeguards.
        </p>
      </InfoSection>

      <InfoSection title="Changes to this notice">
        <p>
          We may update this notice. We will post the revised notice with a new effective date and provide additional
          notice through Omen or email when a change is material and applicable law requires it.
        </p>
      </InfoSection>

      <InfoSection title="Contact us">
        <address className="not-italic">
          {COMPANY}<br />
          23 Darrow St<br />
          New London, CT 06320<br />
          United States<br />
          <a className="font-semibold text-[var(--color-accent)] underline underline-offset-4" href="mailto:privacy@slopssaloon.com">privacy@slopssaloon.com</a>
        </address>
      </InfoSection>

      <InfoSection title="Platform attribution">
        <p>Platform trademarks belong to their respective owners. Omen is not endorsed by or affiliated with Yahoo, Sleeper, ESPN, Disney, or the NFL.</p>
      </InfoSection>
    </PublicInfoLayout>
  );
}
