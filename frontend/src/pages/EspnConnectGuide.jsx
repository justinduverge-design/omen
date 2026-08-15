import { useState } from 'react';
import PublicInfoLayout, { InfoSection } from '../components/layout/PublicInfoLayout.jsx';
import EspnBrowserSupport from '../components/espn/EspnBrowserSupport.jsx';

const GUIDE_URL = 'https://slopssaloon.com/espn-connect';
// Store listings, not the GitHub source tree — a repo URL is a dead end for a normal user
// and asks them to sideload rather than install.
const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/omen-espn-connect/odfoahekibbfjipnofmfenabnnlgfljm';
const SHARE_TEXT = 'Finish ESPN setup on a computer with Omen’s desktop helper.';

export default function EspnConnectGuide() {
  const [copied, setCopied] = useState(false);
  async function share() {
    if (navigator.share) return navigator.share({ title: 'Omen ESPN setup', text: SHARE_TEXT, url: GUIDE_URL });
    await navigator.clipboard?.writeText(GUIDE_URL);
    setCopied(true);
  }
  const href = `mailto:?subject=${encodeURIComponent('Finish ESPN setup with Omen')}&body=${encodeURIComponent(`${SHARE_TEXT}\n${GUIDE_URL}`)}`;
  return <PublicInfoLayout eyebrow="ESPN SETUP" title="Finish ESPN on a computer">
    <p>ESPN makes this more manual than it should be. Omen’s free browser helper handles the tedious part, then you review the form and choose Connect yourself.</p>
    <InfoSection title="Send this setup to yourself">
      <div className="flex flex-wrap gap-3">
        <button className="min-h-[44px] rounded-md px-4 font-semibold" style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }} onClick={share}>Send setup to my phone</button>
        <button className="min-h-[44px] rounded-md border px-4 font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} onClick={share}>{copied ? 'Link copied' : 'Copy setup link'}</button>
        <a className="min-h-[44px] rounded-md border px-4 py-2 font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} href={`sms:?body=${encodeURIComponent(`${SHARE_TEXT} ${GUIDE_URL}`)}`}>Text link</a>
        <a className="min-h-[44px] rounded-md border px-4 py-2 font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} href={href}>Email link</a>
      </div>
    </InfoSection>
    <InfoSection title="Which browser to use"><EspnBrowserSupport /></InfoSection>
    <InfoSection title="What happens next"><ol className="list-decimal space-y-2 pl-5"><li>On a computer, install the Omen ESPN Connect helper in Chrome or Edge.</li><li>Sign in to ESPN Fantasy in that browser.</li><li>Choose Fill into Omen.</li><li>Review the filled form, then select Connect ESPN yourself.</li></ol><p className="pt-3 text-sm">Using Safari or Firefox on a computer? The helper can’t run there, but you can still connect — the ESPN card on the connect page walks you through copying the two values by hand.</p><a className="inline-block min-h-[44px] pt-4 font-semibold underline" style={{ color: 'var(--color-accent)' }} href={CHROME_STORE_URL} target="_blank" rel="noreferrer">Install the helper for Chrome</a></InfoSection>
    <InfoSection title="Watch the walkthrough"><p>A mock 90-second Chrome/Edge walkthrough is coming here. It will show the flow without using a real ESPN account or credentials.</p></InfoSection>
    <p className="text-xs">The helper only fills the Omen form you open; it does not submit it. Platform trademarks belong to their respective owners. Omen is not endorsed by or affiliated with ESPN.</p>
  </PublicInfoLayout>;
}
