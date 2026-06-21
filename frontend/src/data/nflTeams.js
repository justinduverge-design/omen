/**
 * nflTeams.js — NFL team roster with strategic accent color selection.
 *
 * Each team has an `accent` field that is NOT always the jersey primary color.
 * The strategy:
 *
 * Official colors (primary, secondary) come first. textSafe() lifts dark
 * primaries to a readable lightness while preserving hue; it now also clamps
 * hue-shift for near-achromatic accents (LV silver) and decays saturation as
 * lightness rises so deep brand colors don't coral-out (HOU/SF/PHI/ATL — see
 * Phase 1.5e identity audit). Reach for a non-official "synergy" color only
 * when the official pair can't carry a coherent identity even after textSafe.
 *
 *   scheme: 'standard'   — use primary directly (lifted via textSafe if dark).
 *   scheme: 'secondary'  — primary can't carry the identity even lifted
 *                          (near-achromatic, or secondary is the stronger anchor);
 *                          secondary is still an official team color.
 *   scheme: 'colorRush'  — reserved; currently unused (all former colorRush
 *                          teams moved to scheme: 'standard' once their lifted
 *                          primary cleared AA).
 *
 * ── Phase 1.5f additions ───────────────────────────────────────────────────
 *
 *   surfaceAxis: 'light' | 'dark'  (required)
 *     Per-entity (not per-user) light/dark axis decision. Fan-perceived
 *     identity drives the call — Dolphins read Miami Vice (light), Steelers
 *     read steel-mill night (dark). 6 teams flip to light per the 2026-06-20
 *     identity audit: MIA, IND, LAC, DAL, CAR, ARI.
 *
 *   culturalAnchor: { name, year?, kind, hex? }  (optional but most teams have it)
 *     Cited cultural reference that explains the color choice (sneaker
 *     colorway, film, music era, region, history). Surfaced as a one-line
 *     attribution under the selected team on /account/appearance.
 *     `kind` ∈ 'sneaker' | 'film' | 'music' | 'art' | 'region' | 'history' | 'tradition'.
 *
 *   surfaceFrom: 'primary' | 'secondary'  (optional; default 'primary')
 *     Re-derive the team surface from `secondary` instead of `primary`. Used
 *     for NO (gold primary, black secondary → black world with gold accents)
 *     and TB (red primary, pewter-ish secondary → pewter surface, not blood).
 *
 *   accentLifted: { dark?: string, light?: string }  (optional)
 *     Per-team override for the textSafe-lifted accent used as text/border
 *     color. Used when the algorithm would lose brand identity:
 *       HOU — preserves deep Battle Red (don't coral it)
 *       PHI — preserves true midnight green (don't cyan it)
 *       SF  — preserves 49ers red (don't coral it)
 *     ATL is handled via the template-6 Bred bypass, not this field.
 *
 * ── Existing identity copy fields (unchanged) ──────────────────────────────
 *
 *   cultureTag  — 1–3 word fan identity label (pill/badge)
 *   cry         — the chant; short, punchy, what they yell in the stadium
 *   wardRoom    — one-liner war room statement; harder, what the GM says
 *   lore?       — optional deeper fan culture line
 *
 * Placement guide:
 *   cultureTag → Appearance pill, NavDrawer team label, Dashboard header pill
 *   cry        → Omen loading state, Omen page subhead, Appearance above wardRoom
 *   wardRoom   → Appearance selection moment (bold), Standings page subhead
 *   lore       → Appearance secondary line (muted, fan deep-cut)
 *
 * Templates (1-6) name the role-recipe used to derive the team's surface
 * tint, CTA, and accent on accent-active surfaces. See `lib/teamTemplate.js`
 * for the recipe table; see `Blueprints/audits/2026-06-20-phase1-5e-32-team-identity-audit.md`
 * for the full per-team rationale.
 *
 *   1 — Deep & Brand    (primary CTA on hue-of-primary surface — most of NFL)
 *   2 — Two-Tone Royal  (metallic secondary CTA on deep primary surface)
 *   3 — Hot Brand       (red-dominant; warm-yellow accent to defuse danger)
 *   4 — Aqua / Cool     (teal/cyan CTA, warm-pop accent)
 *   5 — Earth           (deep brown surface, vivid accent-color CTA)
 *   6 — Bred            (black canvas + varsity-red CTA — Falcons only,
 *                        Jordan 1 homage; bypasses textSafe to preserve red)
 *
 * Format: { abbr, city, name, div, primary, secondary, accent, scheme,
 *           template, surfaceAxis, culturalAnchor?, surfaceFrom?, accentLifted?,
 *           colorRush?, note?, cultureTag, cry, wardRoom, lore? }
 */

export const NFL_TEAMS = [
  // ─── AFC East ─────────────────────────────────────────────────────────────
  {
    abbr: 'BUF', city: 'Buffalo',      name: 'Bills',
    div: 'AFC East',  primary: '#00338D', secondary: '#C60C30',
    accent: '#00338D', scheme: 'standard', template: 1,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'Bills Mafia', kind: 'tradition' },
    cultureTag: "Bills Mafia",
    cry:        "Everybody Eats",
    wardRoom:   "Mafia don't leave their own.",
  },
  {
    abbr: 'MIA', city: 'Miami',        name: 'Dolphins',
    div: 'AFC East',  primary: '#008E97', secondary: '#FC4C02',
    accent: '#008E97', scheme: 'standard', template: 4,
    surfaceAxis: 'light',
    culturalAnchor: { name: 'Miami Vice', year: 1984, kind: 'film' },
    cultureTag: "The 305",
    cry:        "Fins Up",
    wardRoom:   "305 never sleeps.",
  },
  {
    abbr: 'NE',  city: 'New England',  name: 'Patriots',
    div: 'AFC East',  primary: '#002244', secondary: '#C60C30',
    accent: '#002244', scheme: 'standard', template: 1,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'American Revolution', year: 1775, kind: 'history' },
    cultureTag: "Pats Nation",
    cry:        "Do Your Job",
    wardRoom:   "We all we got, we all we need.",
  },
  {
    abbr: 'NYJ', city: 'New York',     name: 'Jets',
    div: 'AFC East',  primary: '#125740', secondary: '#FFFFFF',
    accent: '#125740', scheme: 'standard', template: 1,
    surfaceAxis: 'dark',
    culturalAnchor: { name: "Jordan 1 'Pine Green'", year: 2020, kind: 'sneaker' },
    cultureTag: "Gang Green",
    cry:        "J-E-T-S",
    wardRoom:   "Gang Green don't blink.",
  },

  // ─── AFC North ────────────────────────────────────────────────────────────
  {
    abbr: 'BAL', city: 'Baltimore',    name: 'Ravens',
    div: 'AFC North', primary: '#241773', secondary: '#9E7C0C',
    accent: '#241773', scheme: 'standard', template: 1,
    surfaceAxis: 'dark',
    culturalAnchor: { name: "Poe's 'The Raven'", year: 1845, kind: 'art' },
    cultureTag: "The Flock",
    cry:        "Big Truzz",
    wardRoom:   "Play like a Raven.",
  },
  {
    abbr: 'CIN', city: 'Cincinnati',   name: 'Bengals',
    div: 'AFC North', primary: '#FB4F14', secondary: '#000000',
    accent: '#FB4F14', scheme: 'standard', template: 5,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'Bengal tiger fur', kind: 'art' },
    cultureTag: "The Jungle",
    cry:        "Who Dey",
    wardRoom:   "They gotta play us.",
  },
  {
    abbr: 'CLE', city: 'Cleveland',    name: 'Browns',
    div: 'AFC North', primary: '#311D00', secondary: '#FF3C00',
    accent: '#311D00', scheme: 'standard', template: 5,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'Otto Graham era leather', year: 1950, kind: 'history' },
    cultureTag: "Dawg Pound",
    cry:        "In Browns We Trust",
    wardRoom:   "Cleveland doesn't fold.",
  },
  {
    abbr: 'PIT', city: 'Pittsburgh',   name: 'Steelers',
    div: 'AFC North', primary: '#101820', secondary: '#FFB612',
    accent: '#FFB612', scheme: 'secondary', template: 2,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'US Steel logo origin', year: 1962, kind: 'history' },
    note: 'Steelers gold (#FFB612) is one of the most iconic colors in the NFL. Standard primary (#101820) is near-black and invisible on dark UI. Diamond logo = literal US Steel mark (coal=yellow, ore=orange, steel=blue).',
    cultureTag: "Steeler Nation",
    cry:        "Here We Go",
    wardRoom:   "Redd up the war room.",
    lore:       "Stillers Nation.",
  },

  // ─── AFC South ────────────────────────────────────────────────────────────
  {
    abbr: 'HOU', city: 'Houston',      name: 'Texans',
    div: 'AFC South', primary: '#03202F', secondary: '#A71930',
    accent: '#A71930', scheme: 'secondary', template: 1,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'NASA Mission Control', year: 1965, kind: 'history' },
    accentLifted: { dark: '#D04250' }, // Battle Red preserved deeper than textSafe coral (defect 1.5e-defect-2 carryover)
    note: 'Standard Texans primary (#03202F) is near-black. Texans red (#A71930) is the visible identity anchor; accentLifted preserves deep Battle Red — avoids coral collision with NYG/ATL.',
    cultureTag: "Bull Pen",
    cry:        "Swarm",
    wardRoom:   "Texas does it bigger.",
  },
  {
    abbr: 'IND', city: 'Indianapolis', name: 'Colts',
    div: 'AFC South', primary: '#002C5F', secondary: '#A2AAAD',
    accent: '#002C5F', scheme: 'standard', template: 1,
    surfaceAxis: 'light',
    culturalAnchor: { name: 'White-helmet horseshoe', year: 1957, kind: 'tradition' },
    cultureTag: "Horseshoe",
    cry:        "For The Shoe",
    wardRoom:   "The Loud House is calling.",
  },
  {
    abbr: 'JAX', city: 'Jacksonville', name: 'Jaguars',
    div: 'AFC South', primary: '#006778', secondary: '#D7A22A',
    accent: '#006778', scheme: 'standard', template: 4,
    surfaceAxis: 'dark',
    culturalAnchor: { name: "Nike SB Dunk 'Tiffany'", year: 2005, kind: 'sneaker' },
    cultureTag: "Duval",
    cry:        "DUUUVAL",
    wardRoom:   "Get it right, this isn't Miami.",
  },
  {
    abbr: 'TEN', city: 'Tennessee',    name: 'Titans',
    div: 'AFC South', primary: '#0C2340', secondary: '#4B92DB',
    accent: '#0C2340', scheme: 'standard', template: 1,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'Greek Titan / Prometheus fire', kind: 'art' },
    cultureTag: "Titan Up",
    cry:        "How Ya Feel?",
    wardRoom:   "Tennessee don't tap out.",
  },

  // ─── AFC West ─────────────────────────────────────────────────────────────
  {
    abbr: 'DEN', city: 'Denver',       name: 'Broncos',
    div: 'AFC West',  primary: '#FB4F14', secondary: '#002244',
    accent: '#FB4F14', scheme: 'standard', template: 3,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'Rocky Mountain sunset', kind: 'region' },
    cultureTag: "Broncos Country",
    cry:        "Mile High Magic",
    wardRoom:   "The altitude changes things.",
  },
  {
    abbr: 'KC',  city: 'Kansas City',  name: 'Chiefs',
    div: 'AFC West',  primary: '#E31837', secondary: '#FFB81C',
    accent: '#E31837', scheme: 'standard', template: 3,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'KC BBQ smokehouse', kind: 'region' },
    cultureTag: "Chiefs Kingdom",
    cry:        "Never a Doubt",
    wardRoom:   "Kingdom don't fold.",
  },
  {
    abbr: 'LV',  city: 'Las Vegas',    name: 'Raiders',
    div: 'AFC West',  primary: '#0B0B0B', secondary: '#A5ACAF',
    accent: '#A5ACAF', scheme: 'secondary', template: 2,
    surfaceAxis: 'dark',
    culturalAnchor: { name: "Air Max 97 'Silver Bullet'", year: 1997, kind: 'sneaker' },
    note: 'Raiders silver (#A5ACAF). Standard black primary is invisible on dark UI. textSafe now clamps hue-shift for near-achromatic accents so silver stays silver (was washing blue — defect 1.5e-defect-1 fix).',
    cultureTag: "Raider Nation",
    cry:        "Just Win Baby",
    wardRoom:   "The Autumn Wind don't stop.",
  },
  {
    abbr: 'LAC', city: 'Los Angeles',  name: 'Chargers',
    div: 'AFC West',  primary: '#0080C6', secondary: '#FFC20E',
    accent: '#0080C6', scheme: 'standard', template: 4,
    surfaceAxis: 'light',
    culturalAnchor: { name: '1960s San Diego beach Chargers', kind: 'tradition' },
    cultureTag: "Broltchachos",
    cry:        "Bolt Up",
    wardRoom:   "Chargers don't ask permission.",
  },

  // ─── NFC East ─────────────────────────────────────────────────────────────
  {
    abbr: 'DAL', city: 'Dallas',       name: 'Cowboys',
    div: 'NFC East',  primary: '#003594', secondary: '#869397',
    accent: '#003594', scheme: 'standard', template: 1,
    surfaceAxis: 'light',
    culturalAnchor: { name: 'Tom Landry silver-and-white era', kind: 'history' },
    cultureTag: "America's Team",
    cry:        "We Dem Boyz",
    wardRoom:   "How 'Bout Them Cowboys.",
  },
  {
    abbr: 'NYG', city: 'New York',     name: 'Giants',
    div: 'NFC East',  primary: '#0B2265', secondary: '#A71930',
    accent: '#0B2265', scheme: 'standard', template: 1,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'Big Blue / NY borough navy', kind: 'tradition' },
    note: 'Giants accent flipped to primary royal blue #0B2265 in Phase 1.5f (was secondary red, which collided with HOU/ATL after textSafe lift — defect 1.5e-defect-3 resolution). "Big Blue" identity wins.',
    cultureTag: "Big Blue",
    cry:        "GO Big Blue",
    wardRoom:   "Fe-Fi-Fo-Fum.",
    lore:       "Giants don't sleep.",
  },
  {
    abbr: 'PHI', city: 'Philadelphia', name: 'Eagles',
    div: 'NFC East',  primary: '#004C54', secondary: '#A5ACAF',
    accent: '#004C54', scheme: 'standard', template: 2,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'Liberty Bell + Rocky underdog', kind: 'region' },
    accentLifted: { dark: '#5DAB9F' }, // Midnight green at altitude — preserves identity vs textSafe cyan (defect 1.5e-defect-4)
    note: 'Midnight Green IS the Eagles identity. accentLifted holds a hand-tuned muted-teal-green so it reads as "midnight green at altitude" rather than the fluorescent cyan the raw textSafe lift produces.',
    cultureTag: "Birds Gang",
    cry:        "Fly Eagles Fly",
    wardRoom:   "No one likes us, we don't care.",
  },
  {
    abbr: 'WAS', city: 'Washington',   name: 'Commanders',
    div: 'NFC East',  primary: '#5A1414', secondary: '#FFB612',
    accent: '#FFB612', scheme: 'secondary', template: 2,
    surfaceAxis: 'dark',
    culturalAnchor: { name: "Jordan 7 'Bordeaux'", year: 1992, kind: 'sneaker' },
    note: 'Commanders gold (#FFB612) pops on dark UI. Bordeaux + gold pairing mirrors Jordan 7 directly.',
    cultureTag: "District",
    cry:        "Hail Victory",
    wardRoom:   "The District doesn't kneel.",
  },

  // ─── NFC North ────────────────────────────────────────────────────────────
  {
    abbr: 'CHI', city: 'Chicago',      name: 'Bears',
    div: 'NFC North', primary: '#0B162A', secondary: '#C83803',
    accent: '#C83803', scheme: 'secondary', template: 1,
    surfaceAxis: 'dark',
    culturalAnchor: { name: '1985 Bears / Walter Payton', year: 1985, kind: 'history' },
    note: 'Bears orange (#C83803) is the real visible identity. Standard primary (#0B162A) is near-black and would vanish on Corvus dark UI.',
    cultureTag: "Da Bears",
    cry:        "Bear Down",
    wardRoom:   "Good, better, best. Never rest.",
  },
  {
    abbr: 'DET', city: 'Detroit',      name: 'Lions',
    div: 'NFC North', primary: '#0076B6', secondary: '#B0B7BC',
    accent: '#0076B6', scheme: 'standard', template: 1,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'Motown / Barry Sanders era', kind: 'music' },
    cultureTag: "One Pride",
    cry:        "Detroit vs. Everybody",
    wardRoom:   "The city always shows up.",
  },
  {
    abbr: 'GB',  city: 'Green Bay',    name: 'Packers',
    div: 'NFC North', primary: '#203731', secondary: '#FFB612',
    accent: '#FFB612', scheme: 'secondary', template: 2,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'Lambeau Field tundra sunset', kind: 'region' },
    note: 'Packers gold (#FFB612) is equally iconic as the green and more vibrant on a dark UI. Frozen-field gold sunset on dark green = the canonical Lambeau pairing.',
    cultureTag: "Cheesehead Nation",
    cry:        "Go You Packers Go",
    wardRoom:   "Titletown.",
    lore:       "The Bears still suck.",
  },
  {
    abbr: 'MIN', city: 'Minnesota',    name: 'Vikings',
    div: 'NFC North', primary: '#4F2683', secondary: '#FFC62F',
    accent: '#4F2683', scheme: 'standard', template: 2,
    surfaceAxis: 'dark',
    culturalAnchor: { name: "Jordan 5 'Grape'", year: 1990, kind: 'sneaker' },
    cultureTag: "Skol Vikings",
    cry:        "Skol",
    wardRoom:   "The Bold North doesn't forget.",
  },

  // ─── NFC South ────────────────────────────────────────────────────────────
  {
    abbr: 'ATL', city: 'Atlanta',      name: 'Falcons',
    div: 'NFC South', primary: '#A71930', secondary: '#000000',
    accent: '#A71930', scheme: 'standard', template: 6,
    surfaceAxis: 'dark',
    culturalAnchor: { name: "Jordan 1 'Bred'", year: 1985, kind: 'sneaker' },
    note: 'Bred template (6) bypasses textSafe entirely so the raw varsity red preserves identity against pure black canvas (defect 1.5e-defect-2 fix). Jordan 1 Bred is the explicit visual reference.',
    cultureTag: "Rise Up",
    cry:        "Rise Up",
    wardRoom:   "The City Too Busy to Hate.",
    lore:       "F.I.L.A.",
  },
  {
    abbr: 'CAR', city: 'Carolina',     name: 'Panthers',
    div: 'NFC South', primary: '#0085CA', secondary: '#101820',
    accent: '#0085CA', scheme: 'standard', template: 1,
    surfaceAxis: 'light',
    culturalAnchor: { name: 'Carolina blue / UNC heritage', kind: 'region' },
    cultureTag: "Keep Pounding",
    cry:        "Keep Pounding",
    wardRoom:   "Carolina never stops running.",
  },
  {
    abbr: 'NO',  city: 'New Orleans',  name: 'Saints',
    div: 'NFC South', primary: '#D3BC8D', secondary: '#101820',
    accent: '#D3BC8D', scheme: 'standard', template: 2,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'Mardi Gras Krewes / Bourbon Street brass', kind: 'tradition' },
    surfaceFrom: 'secondary', // gold primary, black secondary → world is black, accents are gold
    cultureTag: "Who Dat Nation",
    cry:        "Who Dat",
    wardRoom:   "Laissez les bons temps rouler.",
  },
  {
    abbr: 'TB',  city: 'Tampa Bay',    name: 'Buccaneers',
    div: 'NFC South', primary: '#D50A0A', secondary: '#FF7900',
    accent: '#D50A0A', scheme: 'standard', template: 3,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'Gasparilla pirate festival', kind: 'tradition' },
    surfaceFrom: 'secondary', // red primary would tint the world blood-red; pewter-ish secondary keeps pirate identity (defect 1.5e-defect-5)
    note: 'Surface derives from secondary (orange) instead of primary (red) so the world reads pewter-warm rather than blood — matches Gasparilla pirate-helmet identity. Accent stays cannon-red.',
    cultureTag: "Krewe",
    cry:        "Fire the Cannons",
    wardRoom:   "No Risk It, No Biscuit.",
  },

  // ─── NFC West ─────────────────────────────────────────────────────────────
  {
    abbr: 'ARI', city: 'Arizona',      name: 'Cardinals',
    div: 'NFC West',  primary: '#97233F', secondary: '#FFB612',
    accent: '#97233F', scheme: 'standard', template: 3,
    surfaceAxis: 'light',
    culturalAnchor: { name: "Jordan 6 'Toro Bravo'", year: 2014, kind: 'sneaker' },
    cultureTag: "Red Sea",
    cry:        "Be Water",
    wardRoom:   "Red Sea rising.",
  },
  {
    abbr: 'LAR', city: 'Los Angeles',  name: 'Rams',
    div: 'NFC West',  primary: '#003594', secondary: '#FFA300',
    accent: '#FFA300', scheme: 'secondary', template: 2,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'Hollywood Walk of Fame gold', year: 1958, kind: 'region' },
    note: 'Rams gold/bone (#FFA300) is the distinctive modern Rams color. Walk-of-Fame gold-on-blue is the LA throughline.',
    cultureTag: "Rams House",
    cry:        "Whose House",
    wardRoom:   "Whose House? Rams House.",
    lore:       "Horns Up.",
  },
  {
    abbr: 'SF',  city: 'San Francisco', name: '49ers',
    div: 'NFC West',  primary: '#AA0000', secondary: '#B3995D',
    accent: '#AA0000', scheme: 'standard', template: 2,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'California Gold Rush', year: 1849, kind: 'history' },
    accentLifted: { dark: '#D72020' }, // Preserves 49ers red, avoids textSafe coral-lift (defect 1.5e-defect-6)
    cultureTag: "Gold Rush",
    cry:        "Bang Bang Niner Gang",
    wardRoom:   "Faithful to The Bay.",
  },
  {
    abbr: 'SEA', city: 'Seattle',      name: 'Seahawks',
    div: 'NFC West',  primary: '#002244', secondary: '#69BE28',
    accent: '#69BE28', scheme: 'secondary', template: 1,
    surfaceAxis: 'dark',
    culturalAnchor: { name: 'Pike Place grunge / PNW forest', year: 1990, kind: 'music' },
    note: "Seahawks Action Green (#69BE28) is their most distinctive color. With the new --color-text-on-accent token, the dark-text-on-action-green CTA finally clears AA.",
    cultureTag: "The 12s",
    cry:        "SEA HAWKS",
    wardRoom:   "12s don't leave.",
  },
];

// ── Color math utilities ───────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relLum([r, g, b]) {
  return [r, g, b]
    .map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Lift a color to be readable as text/border on the given surface axis.
 *
 * Two behaviors:
 *
 *   1. **Near-achromatic accents (HSL saturation < 10%)** preserve hue and
 *      saturation exactly — only lightness moves. Fixes the LV Raiders
 *      silver hue-shift (defect 1.5e-defect-1): the prior algorithm bumped
 *      S from 6% to 38%, which painted the silver cool-blue. Silver now
 *      stays silver.
 *
 *   2. **Colored accents** lift L toward the readable target (58 on dark,
 *      ≤42 on light) and decay S as L moves, so deep brand reds don't
 *      coral-out into fluorescent pink as they brighten. The decay is mild
 *      enough that vivid teams (KC red, GB gold, CIN orange) keep their
 *      punch.
 *
 * Per-team `accentLifted: { dark|light }` overrides this function for the
 * handful of teams whose identity the algorithm can't preserve (HOU, PHI,
 * SF). Bred template-6 bypasses textSafe entirely (ATL) — that bypass lives
 * in teamTemplate.js, not here.
 *
 * @param hex   The brand accent hex.
 * @param axis  'dark' | 'light' — surface the accent will appear on.
 *              Default 'dark' for back-compat with pre-1.5f callers.
 */
export function textSafe(hex, axis = 'dark') {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));

  // Near-achromatic: lock hue + saturation, only nudge L.
  if (s < 10) {
    if (axis === 'dark') return hslToHex(h, s, Math.max(l, 58));
    return hslToHex(h, s, Math.min(l, 42));
  }

  if (axis === 'dark') {
    const targetL = Math.max(l, 58);
    // S decay: as L rises, drop S proportionally to avoid the fluorescent lift.
    // At lift = 0 → S preserved. At lift = 40 (e.g. #004C54 → L58), S keeps ~60%.
    const lift = targetL - l;
    const sScaled = Math.max(28, s * (1 - lift / 100));
    return hslToHex(h, sScaled, targetL);
  }

  // axis === 'light'
  const targetL = Math.min(l, 42);
  // Light axis: vivid is fine on cream; only drop S a little if we had to drop L hard.
  const drop = l - targetL;
  const sScaled = Math.max(28, s * (1 - drop / 200));
  return hslToHex(h, sScaled, targetL);
}

/**
 * Return the per-team lifted accent for the given axis. Honors the
 * team-level `accentLifted` override if present, otherwise falls through to
 * textSafe(team.accent, axis).
 */
export function teamAccentOn(team, axis = 'dark') {
  if (!team) return null;
  const override = team.accentLifted?.[axis];
  if (override) return override;
  return textSafe(team.accent, axis);
}

/**
 * WCAG contrast ratio between two hex colors.
 */
function contrastRatio(hexA, hexB) {
  const la = relLum(hexToRgb(hexA));
  const lb = relLum(hexToRgb(hexB));
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Return the best foreground color (#0A0A0B dark or #F5F0E8 light) for text
 * printed ON TOP of the given background hex, chosen by actual WCAG contrast
 * rather than a luminance heuristic. Picking by contrast correctly handles
 * mid-luminance teals, oranges, and silvers where the visual-luminance
 * threshold misjudges the better polarity.
 */
export function readableOn(hex) {
  return contrastRatio('#0A0A0B', hex) >= contrastRatio('#F5F0E8', hex)
    ? '#0A0A0B'
    : '#F5F0E8';
}

/**
 * Returns true when the color is dark enough to need the hairline-inset tile border.
 */
export function isDark(hex) {
  return relLum(hexToRgb(hex)) < 0.12;
}

/**
 * Given a team abbreviation (or null for Corvus default), return the three
 * CSS values needed to fully theme the app:
 *   accentBg   — raw accent color (for tile rings, fills, vivid elements)
 *   accentText — textSafe-lifted accent (for text labels, borders on dark bg)
 *   accentOn   — foreground color on top of accentBg (for CTA button text)
 *
 * Retained for back-compat with pre-Phase-1.5 callers. New code should use
 * getTeamTemplate() in lib/teamTemplate.js which returns the full token
 * bundle including axis + textOnAccent.
 */
export function getTeamTheme(abbr) {
  if (!abbr) {
    return { accentBg: '#B8952A', accentText: '#B8952A', accentOn: '#0A0A0B' };
  }
  const team = NFL_TEAMS.find((t) => t.abbr === abbr);
  if (!team) return getTeamTheme(null);

  const accentBg = team.accent;
  const accentText = teamAccentOn(team, team.surfaceAxis ?? 'dark');
  const accentOn = readableOn(accentBg);
  return { accentBg, accentText, accentOn };
}

// Sorted by division for the "Show all 32" expand view
export const TEAMS_BY_DIV = [
  'AFC East', 'AFC North', 'AFC South', 'AFC West',
  'NFC East', 'NFC North', 'NFC South', 'NFC West',
].flatMap((div) => NFL_TEAMS.filter((t) => t.div === div));

// The 8 marquee teams shown in the initial (collapsed) grid
export const MARQUEE_ABBRS = ['KC', 'PHI', 'SF', 'DAL', 'BUF', 'BAL', 'DET', 'MIA'];
