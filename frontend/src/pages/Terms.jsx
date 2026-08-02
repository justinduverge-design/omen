import PublicInfoLayout, { InfoSection } from '../components/layout/PublicInfoLayout.jsx';

export default function Terms() {
  return (
    <PublicInfoLayout eyebrow="Terms" title="Terms of Use" updatedAt="August 2, 2026">
      <p>
        Omen is a product of Valor Ventures LLC. These terms describe the current Omen product. They are a plain-language
        product notice, not legal advice, and remain subject to final founder and counsel review where required.
      </p>

      <InfoSection title="Using Omen">
        <p>
          Omen is a fantasy-football decision-support product. You are responsible for making sure you have the right to
          connect any fantasy platform account, league, team, or roster. You may disconnect a platform where that control
          is available.
        </p>
      </InfoSection>

      <InfoSection title="Third-party platforms">
        <p>
          Omen can connect with fantasy-football platforms such as Yahoo Fantasy Sports, Sleeper, and ESPN when you
          choose to connect an account or enter connection details. Those platforms are operated by third parties, and
          your use of them remains governed by their own terms, privacy notices, and account rules.
        </p>
        <p>
          Platform data can be delayed, unavailable, incomplete, or affected by outages, rate limits, account settings,
          league privacy, season timing, credential expiration, or provider changes. Omen does not guarantee that
          platform data will always be available or correct.
        </p>
      </InfoSection>

      <InfoSection title="ESPN connection notice">
        <p>
          ESPN support may require user-provided ESPN session cookie values to attempt to read a fantasy league. Omen
          treats those values as sensitive credentials. ESPN-connected features may be fragile and may be disabled or
          limited if security, privacy, operational, or platform-terms risks require it.
        </p>
      </InfoSection>

      <InfoSection title="No betting or guaranteed outcomes">
        <p>
          Omen recommendations are informational fantasy-football tools, not guarantees of player performance, league
          results, prizes, winnings, or financial outcomes. Omen does not provide betting, gambling, financial, legal,
          tax, or professional advice. Do not use Omen as the basis for wagering, paid contest entries, or a guaranteed-result claim.
        </p>
      </InfoSection>

      <InfoSection title="Platform attribution">
        <p>Platform trademarks belong to their respective owners. Omen is not endorsed by or affiliated with Yahoo, Sleeper, ESPN, Disney, or the NFL.</p>
      </InfoSection>

      <InfoSection title="Terms questions">
        <p>
          For a question about these terms, contact{' '}
          <a className="font-semibold text-[var(--color-accent)] underline underline-offset-4" href="mailto:legal@slopssaloon.com">legal@slopssaloon.com</a>.
        </p>
      </InfoSection>
    </PublicInfoLayout>
  );
}
