import { useEffect, useState } from 'react';
import PublicInfoLayout, { InfoSection } from '../components/layout/PublicInfoLayout.jsx';
import EspnBrowserSupport from '../components/espn/EspnBrowserSupport.jsx';

const GUIDE_URL = 'https://slopssaloon.com/espn-connect';
// Store listings, not the GitHub source tree — a repo URL is a dead end for a normal user
// and asks them to sideload rather than install.
const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/omen-espn-connect/odfoahekibbfjipnofmfenabnnlgfljm';
const EDGE_STORE_URL = 'https://microsoftedge.microsoft.com/addons/detail/omen-espn-connect/nkcbgdhpekbclicgcfbokjmcgkhfhddl';
const CONNECT_PAGE_URL = '/account/connect';
const SHARE_TEXT = 'Finish ESPN setup on a computer with Omen’s desktop helper.';

/**
 * Which half of this page is the *next* action for the person reading it.
 *
 * The two audiences want opposite things and the page used to lead with the wrong one for
 * both: a phone user arrives from the app and needs to move this errand to a computer, while
 * a desktop user has already moved it and needs the install button. Ordering by surface is
 * the whole fix.
 *
 * `pointer: fine` is the honest test — it asks whether there is a mouse, not what the user
 * agent claims — and it is paired with a width check so a desktop browser dragged narrow
 * still reads as desktop. Unknown is a real answer (no `matchMedia`, no JS yet), and it
 * renders both halves rather than guessing.
 */
function detectSurface() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'unknown';
  const desktop = window.matchMedia('(pointer: fine)').matches && window.innerWidth >= 700;
  return desktop ? 'desktop' : 'mobile';
}

const linkButton = { borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };
const primaryButton = { background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' };

export default function EspnConnectGuide() {
  const [copied, setCopied] = useState(false);
  const [surface, setSurface] = useState('unknown');
  useEffect(() => { setSurface(detectSurface()); }, []);

  async function share() {
    if (navigator.share) return navigator.share({ title: 'Omen ESPN setup', text: SHARE_TEXT, url: GUIDE_URL });
    await navigator.clipboard?.writeText(GUIDE_URL);
    setCopied(true);
  }
  const href = `mailto:?subject=${encodeURIComponent('Finish ESPN setup with Omen')}&body=${encodeURIComponent(`${SHARE_TEXT}\n${GUIDE_URL}`)}`;

  // On a computer, install is the next tap. On a phone it is not installable at all, so it is
  // shown as context further down rather than as an action that cannot be taken.
  const installHere = (
    <InfoSection title={surface === 'desktop' ? 'You’re on a computer — start here' : 'On the computer, install the helper'}>
      <p>The helper is free, reads espn.com only, and never submits anything for you.</p>
      <div className="flex flex-wrap gap-3">
        <a className="min-h-[44px] rounded-md px-4 py-2 font-semibold" style={primaryButton} href={CHROME_STORE_URL} target="_blank" rel="noreferrer">Add to Chrome</a>
        <a className="min-h-[44px] rounded-md border px-4 py-2 font-semibold" style={linkButton} href={EDGE_STORE_URL} target="_blank" rel="noreferrer">Add to Edge</a>
        <a className="min-h-[44px] rounded-md border px-4 py-2 font-semibold" style={linkButton} href={CONNECT_PAGE_URL}>Open the Omen connect page</a>
      </div>
      <p className="text-sm">Then sign in to ESPN Fantasy in that same browser, choose Fill into Omen, review the form, and press Connect ESPN yourself.</p>
    </InfoSection>
  );

  const handoff = (
    <InfoSection title={surface === 'mobile' ? 'Send this to your computer' : 'Send this setup to yourself'}>
      <p>Nothing here is your ESPN account — the only thing sent is a link to this page.</p>
      <div className="flex flex-wrap gap-3">
        <button className="min-h-[44px] rounded-md px-4 font-semibold" style={primaryButton} onClick={share}>Send setup to my computer</button>
        <button className="min-h-[44px] rounded-md border px-4 font-semibold" style={linkButton} onClick={share}>{copied ? 'Link copied' : 'Copy setup link'}</button>
        <a className="min-h-[44px] rounded-md border px-4 py-2 font-semibold" style={linkButton} href={`sms:?body=${encodeURIComponent(`${SHARE_TEXT} ${GUIDE_URL}`)}`}>Text link</a>
        <a className="min-h-[44px] rounded-md border px-4 py-2 font-semibold" style={linkButton} href={href}>Email link</a>
      </div>
    </InfoSection>
  );

  return <PublicInfoLayout eyebrow="ESPN SETUP" title="Finish ESPN on a computer">
    <p>ESPN gives Omen no phone sign-in, so this one step happens on a computer. Omen’s free browser helper handles the tedious part, then you review the form and choose Connect yourself. You do it once.</p>
    {surface === 'desktop' ? <>{installHere}{handoff}</> : <>{handoff}{installHere}</>}
    {/* Store links live in `installHere` now, so the support table states support only. */}
    <InfoSection title="Which browser to use"><EspnBrowserSupport storeLinks={false} /></InfoSection>
    <InfoSection title="What happens next"><ol className="list-decimal space-y-2 pl-5"><li>On a computer, install the Omen ESPN Connect helper in Chrome or Edge.</li><li>Sign in to ESPN Fantasy in that browser.</li><li>Choose Fill into Omen.</li><li>Review the filled form, then select Connect ESPN yourself.</li><li>Back in the Omen app, tap <strong>I connected ESPN</strong> — it re-checks your leagues and takes you to Command Center.</li></ol><p className="pt-3 text-sm">Using Safari or Firefox on a computer? The helper can’t run there, but you can still connect — the ESPN card on the connect page walks you through copying the two values by hand.</p></InfoSection>
    <InfoSection title="Watch the walkthrough"><p>A mock 90-second Chrome/Edge walkthrough is coming here. It will show the flow without using a real ESPN account or credentials.</p></InfoSection>
    <p className="text-xs">The helper only fills the Omen form you open; it does not submit it. Platform trademarks belong to their respective owners. Omen is not endorsed by or affiliated with ESPN.</p>
  </PublicInfoLayout>;
}
