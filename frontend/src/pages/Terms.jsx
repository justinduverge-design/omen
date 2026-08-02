import PublicInfoLayout, { InfoSection } from '../components/layout/PublicInfoLayout.jsx';

const COMPANY = 'Valor Ventures Limited Liability Company';

export default function Terms() {
  return (
    <PublicInfoLayout eyebrow="Terms" title="Terms of Use" updatedAt="August 2, 2026">
      <p>
        Effective August 2, 2026. These Terms of Use form an agreement between you and {COMPANY} (&quot;Valor Ventures,&quot;
        &quot;we,&quot; or &quot;us&quot;) governing Omen. By creating an account, signing in, or using Omen, you agree to these Terms
        and acknowledge the Privacy Notice. If you do not agree, do not use Omen.
      </p>

      <InfoSection title="Eligibility">
        <p>
          You must be at least 13 years old to use Omen. If you are under the age of legal majority where you live, you
          may use Omen only with permission from a parent or legal guardian. You represent that you meet these requirements
          and may enter this agreement.
        </p>
      </InfoSection>

      <InfoSection title="What Omen provides">
        <p>
          Omen is a free fantasy-football decision-support product. It may provide league information, recommendations,
          draft tools, standings, and plain-English explanations. Features may be labeled beta, preview, demo, or
          unavailable and may change as the product develops.
        </p>
      </InfoSection>

      <InfoSection title="No paid contests, wagering, or guarantees">
        <p>
          Omen does not operate or facilitate paid contests, wagering, gambling, betting, entry fees, prize pools, or
          cash-out functionality. Omen&apos;s information is for managing ordinary fantasy-football leagues and is not a
          guarantee of player performance, league results, prizes, winnings, or any financial outcome. Omen does not
          provide gambling, financial, legal, tax, medical, or other professional advice.
        </p>
      </InfoSection>

      <InfoSection title="Accounts and security">
        <p>
          You must provide accurate information, keep your account and devices secure, and promptly tell us about suspected
          unauthorized use. You are responsible for activity under your account. You may not share connection credentials
          with another person through Omen or attempt to access another user&apos;s data.
        </p>
      </InfoSection>

      <InfoSection title="Connected platforms">
        <p>
          You may connect only accounts, leagues, teams, and rosters you are authorized to access. Yahoo, Sleeper, ESPN,
          and other platforms are independent third parties whose own terms and privacy notices continue to apply. Platform
          data may be delayed, incomplete, unavailable, or affected by outages, rate limits, privacy settings, season timing,
          credential expiration, or provider changes. We do not promise continuous access to any third-party integration.
        </p>
        <p>
          ESPN support may require ESPN session-cookie values you choose to provide. This unofficial connection method may
          be fragile and may be limited or disabled when security, privacy, operational, or platform-policy concerns require it.
        </p>
      </InfoSection>

      <InfoSection title="Acceptable use">
        <p>You may use Omen only for lawful personal use. You may not:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>break a law, violate another person&apos;s rights, or violate a connected platform&apos;s rules;</li>
          <li>probe, disrupt, overload, bypass, or compromise Omen or another system;</li>
          <li>scrape, reverse engineer, copy, resell, or commercially exploit Omen except where law expressly permits;</li>
          <li>upload malicious code, impersonate another person, or submit false or harmful material;</li>
          <li>use Omen to facilitate betting, wagering, paid contests, fraud, or abuse.</li>
        </ul>
      </InfoSection>

      <InfoSection title="Omen and user content">
        <p>
          Omen, its software, design, branding, and original content belong to Valor Ventures or its licensors and are
          protected by intellectual-property laws. We grant you a limited, revocable, non-exclusive, non-transferable
          right to use Omen under these Terms. You retain ownership of content you submit and grant us a limited license
          to host, process, reproduce, and display it only as needed to operate and improve Omen. Feedback may be used
          without restriction or compensation.
        </p>
      </InfoSection>

      <InfoSection title="Privacy">
        <p>
          Our Privacy Notice explains how Omen handles personal information and is incorporated into these Terms by
          reference. You may stop using Omen and delete your account as described there.
        </p>
      </InfoSection>

      <InfoSection title="Availability, changes, and termination">
        <p>
          We may add, change, suspend, or discontinue features; impose reasonable limits; or restrict access for security,
          legal, operational, or product reasons. You may stop using Omen at any time. We may suspend or terminate access
          if you violate these Terms, create risk or harm, or if operating the service is no longer practical. Provisions
          that by their nature should survive termination will survive.
        </p>
      </InfoSection>

      <InfoSection title="Disclaimers">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, OMEN IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; VALOR VENTURES
          DISCLAIMS ALL EXPRESS OR IMPLIED WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          NON-INFRINGEMENT, ACCURACY, AND AVAILABILITY. We do not warrant that Omen will be uninterrupted, secure,
          error-free, or that recommendations or third-party data will be accurate or produce a particular result.
        </p>
      </InfoSection>

      <InfoSection title="Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, VALOR VENTURES AND ITS OWNERS, PERSONNEL, AND PROVIDERS WILL NOT BE
          LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS,
          DATA, GOODWILL, OR OPPORTUNITIES. OUR TOTAL LIABILITY ARISING FROM OMEN WILL NOT EXCEED THE GREATER OF $100 OR
          THE AMOUNT YOU PAID US FOR OMEN IN THE 12 MONTHS BEFORE THE CLAIM. These limits do not apply where prohibited
          by law, and they do not limit liability that cannot lawfully be limited.
        </p>
      </InfoSection>

      <InfoSection title="Indemnity">
        <p>
          To the extent permitted by law, you will defend, indemnify, and hold Valor Ventures harmless from third-party
          claims and reasonable costs arising from your unlawful misuse of Omen, your violation of these Terms, or your
          violation of another person&apos;s rights. This obligation does not apply to the extent a claim results from our own conduct.
        </p>
      </InfoSection>

      <InfoSection title="Governing law and disputes">
        <p>
          Connecticut law governs these Terms, without regard to conflict-of-law principles. Any dispute must be brought
          in a state court located in New London County, Connecticut, or the federal court serving that location, and each
          party consents to those courts&apos; jurisdiction. Nothing here prevents either party from seeking appropriate
          injunctive relief or using a small-claims court with jurisdiction. Mandatory consumer protections in your home
          jurisdiction still apply when they cannot be waived.
        </p>
      </InfoSection>

      <InfoSection title="Changes and general terms">
        <p>
          We may update these Terms by posting the revised version and changing the effective date. We will provide
          additional notice for material changes when required. Continued use after the updated Terms take effect means
          you accept them. If you do not agree, stop using Omen and delete your account.
        </p>
        <p>
          These Terms and the Privacy Notice are the entire agreement about Omen. If one provision is unenforceable, the
          remainder stays effective. A failure to enforce a provision is not a waiver. You may not assign these Terms
          without our consent; we may assign them in connection with a reorganization, financing, or transfer of Omen.
        </p>
      </InfoSection>

      <InfoSection title="Contact us">
        <address className="not-italic">
          {COMPANY}<br />
          23 Darrow St<br />
          New London, CT 06320<br />
          United States<br />
          <a className="font-semibold text-[var(--color-accent)] underline underline-offset-4" href="mailto:legal@slopssaloon.com">legal@slopssaloon.com</a>
        </address>
      </InfoSection>

      <InfoSection title="Platform attribution">
        <p>Platform trademarks belong to their respective owners. Omen is not endorsed by or affiliated with Yahoo, Sleeper, ESPN, Disney, or the NFL.</p>
      </InfoSection>
    </PublicInfoLayout>
  );
}
