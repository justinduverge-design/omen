/**
 * nflTeams.js — NFL team roster with strategic accent color selection
 *
 * Each team has an `accent` field that is NOT always the jersey primary color.
 * The strategy:
 *
 *   scheme: 'standard'   — primary color is bright enough; use it directly.
 *   scheme: 'secondary'  — primary is near-black or too dark on Corvus dark UI;
 *                          use the secondary (which IS the visible identity anchor).
 *   scheme: 'colorRush'  — a fan-beloved Color Rush palette is more distinctive
 *                          and better-received than the standard uniform palette.
 *
 * The `accent` value feeds directly into the CSS var override. textSafe() in
 * teamTheme.js lifts very dark accents to minimum L=58 for readability as text.
 *
 * Identity fields (all in team accent color across the app):
 *
 *   cultureTag  — 1–3 word fan identity label (pill/badge)
 *   cry         — the chant; short, punchy, what they yell in the stadium
 *   wardRoom    — one-liner war room statement; harder, what the GM says at halftime
 *   lore?       — optional deeper fan culture line for teams with more to say
 *
 * Placement guide:
 *   cultureTag → Appearance pill, NavDrawer team label, Dashboard header pill
 *   cry        → Omen loading state, Omen page subhead, Appearance above wardRoom (lighter weight)
 *   wardRoom   → Appearance selection moment (bold), Standings page subhead
 *   lore       → Appearance secondary line (muted, fan deep-cut)
 *
 * The `template` field (1-6) names the role-recipe used to derive the team's
 * surface tint, CTA color, and accent on the Appearance page and any
 * accent-active surface. See `lib/teamTemplate.js` for the recipe table; see
 * `Blueprints/audits/2026-06-16-phase1-5-team-template-assignment.md` for the
 * full 32-team contrast table.
 *
 *   1 — Deep & Brand    (primary CTA, secondary accent — most of NFL)
 *   2 — Two-Tone Royal  (metallic secondary CTA on deep primary surface)
 *   3 — Hot Brand       (red-dominant; warm-yellow accent to defuse danger)
 *   4 — Aqua / Cool     (teal/cyan CTA, warm-pop accent)
 *   5 — Earth           (deep brown surface, vivid accent-color CTA)
 *   6 — Bred            (black canvas + varsity-red CTA — Falcons only, Jordan 1 homage)
 *
 * Saints are a template-2 SPECIAL CASE: their primary is gold and secondary
 * is black, so `getTeamTemplate('NO')` swaps primary↔secondary for surface
 * derivation only — the surface is black, the CTA is gold.
 *
 * Format: { abbr, city, name, div, primary, secondary, accent, scheme,
 *           template, colorRush?, note?, cultureTag, cry, wardRoom, lore? }
 */

export const NFL_TEAMS = [
  // ─── AFC East ─────────────────────────────────────────────────────────────
  {
    abbr: 'BUF', city: 'Buffalo',      name: 'Bills',
    div: 'AFC East',  primary: '#00338D', secondary: '#C60C30',
    accent: '#00338D', scheme: 'standard', template: 1,
    cultureTag: "Bills Mafia",
    cry:        "Everybody Eats",
    wardRoom:   "Mafia don't leave their own.",
  },
  {
    abbr: 'MIA', city: 'Miami',        name: 'Dolphins',
    div: 'AFC East',  primary: '#008E97', secondary: '#FC4C02',
    accent: '#008E97', scheme: 'standard', template: 4,
    cultureTag: "The 305",
    cry:        "Fins Up",
    wardRoom:   "305 never sleeps.",
  },
  {
    abbr: 'NE',  city: 'New England',  name: 'Patriots',
    div: 'AFC East',  primary: '#002244', secondary: '#C60C30',
    accent: '#C60C30', scheme: 'colorRush', template: 1,
    colorRush: '#C60C30',
    note: 'Patriots Color Rush all-red is highly popular. Standard navy (#002244) is very dark and indistinguishable from other dark-navy teams. Red is the Patriots\' distinctive visible accent.',
    cultureTag: "Pats Nation",
    cry:        "Do Your Job",
    wardRoom:   "We all we got, we all we need.",
  },
  {
    abbr: 'NYJ', city: 'New York',     name: 'Jets',
    div: 'AFC East',  primary: '#125740', secondary: '#FFFFFF',
    accent: '#00703C', scheme: 'colorRush', template: 1,
    colorRush: '#00703C',
    note: 'Jets fans have campaigned to bring back classic Kelly Green for decades. The current dark teal (#125740) is divisive. Kelly Green is the beloved identity.',
    cultureTag: "Gang Green",
    cry:        "J-E-T-S",
    wardRoom:   "Gang Green don't blink.",
  },

  // ─── AFC North ────────────────────────────────────────────────────────────
  {
    abbr: 'BAL', city: 'Baltimore',    name: 'Ravens',
    div: 'AFC North', primary: '#241773', secondary: '#9E7C0C',
    accent: '#241773', scheme: 'standard', template: 1,
    // textSafe lifts #241773 (L≈7.7) to readable purple ~#6B4FD4
    cultureTag: "The Flock",
    cry:        "Big Truzz",
    wardRoom:   "Play like a Raven.",
  },
  {
    abbr: 'CIN', city: 'Cincinnati',   name: 'Bengals',
    div: 'AFC North', primary: '#FB4F14', secondary: '#000000',
    accent: '#FB4F14', scheme: 'standard', template: 5,
    cultureTag: "The Jungle",
    cry:        "Who Dey",
    wardRoom:   "They gotta play us.",
  },
  {
    abbr: 'CLE', city: 'Cleveland',    name: 'Browns',
    div: 'AFC North', primary: '#311D00', secondary: '#FF3C00',
    accent: '#FF3C00', scheme: 'colorRush', template: 5,
    colorRush: '#FF3C00',
    note: 'Browns Color Rush all-orange is iconic and fan-beloved. Standard dark brown (#311D00) would vanish on Corvus dark UI.',
    cultureTag: "Dawg Pound",
    cry:        "In Browns We Trust",
    wardRoom:   "Cleveland doesn't fold.",
  },
  {
    abbr: 'PIT', city: 'Pittsburgh',   name: 'Steelers',
    div: 'AFC North', primary: '#101820', secondary: '#FFB612',
    accent: '#FFB612', scheme: 'secondary', template: 2,
    note: 'Steelers gold (#FFB612) is one of the most iconic colors in the NFL. Standard primary (#101820) is near-black and invisible on dark UI.',
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
    note: 'Standard Texans primary (#03202F) is near-black. Texans red (#A71930) is the visible identity anchor on the dark Corvus UI.',
    cultureTag: "Bull Pen",
    cry:        "Swarm",
    wardRoom:   "Texas does it bigger.",
  },
  {
    abbr: 'IND', city: 'Indianapolis', name: 'Colts',
    div: 'AFC South', primary: '#002C5F', secondary: '#A2AAAD',
    accent: '#002C5F', scheme: 'standard', template: 1,
    cultureTag: "Horseshoe",
    cry:        "For The Shoe",
    wardRoom:   "The Loud House is calling.",
  },
  {
    abbr: 'JAX', city: 'Jacksonville', name: 'Jaguars',
    div: 'AFC South', primary: '#006778', secondary: '#D7A22A',
    accent: '#006778', scheme: 'standard', template: 4,
    cultureTag: "Duval",
    cry:        "DUUUVAL",
    wardRoom:   "Get it right, this isn't Miami.",
  },
  {
    abbr: 'TEN', city: 'Tennessee',    name: 'Titans',
    div: 'AFC South', primary: '#0C2340', secondary: '#4B92DB',
    accent: '#4B92DB', scheme: 'colorRush', template: 1,
    colorRush: '#4B92DB',
    note: 'Titans sky blue from their Color Rush look is beloved by fans — the classic "Columbia Blue" identity. Standard dark navy (#0C2340) is indistinct.',
    cultureTag: "Titan Up",
    cry:        "How Ya Feel?",
    wardRoom:   "Tennessee don't tap out.",
  },

  // ─── AFC West ─────────────────────────────────────────────────────────────
  {
    abbr: 'DEN', city: 'Denver',       name: 'Broncos',
    div: 'AFC West',  primary: '#FB4F14', secondary: '#002244',
    accent: '#FB4F14', scheme: 'standard', template: 3,
    cultureTag: "Broncos Country",
    cry:        "Mile High Magic",
    wardRoom:   "The altitude changes things.",
  },
  {
    abbr: 'KC',  city: 'Kansas City',  name: 'Chiefs',
    div: 'AFC West',  primary: '#E31837', secondary: '#FFB81C',
    accent: '#E31837', scheme: 'standard', template: 3,
    cultureTag: "Chiefs Kingdom",
    cry:        "Never a Doubt",
    wardRoom:   "Kingdom don't fold.",
  },
  {
    abbr: 'LV',  city: 'Las Vegas',    name: 'Raiders',
    div: 'AFC West',  primary: '#0B0B0B', secondary: '#A5ACAF',
    accent: '#A5ACAF', scheme: 'secondary', template: 2,
    note: 'Raiders silver (#A5ACAF) is used because the standard black primary (#0B0B0B) is invisible on Corvus dark background. Silver is the Raiders\' other identity color.',
    cultureTag: "Raider Nation",
    cry:        "Just Win Baby",
    wardRoom:   "The Autumn Wind don't stop.",
  },
  {
    abbr: 'LAC', city: 'Los Angeles',  name: 'Chargers',
    div: 'AFC West',  primary: '#0080C6', secondary: '#FFC20E',
    accent: '#6DB3E5', scheme: 'colorRush', template: 4,
    colorRush: '#6DB3E5',
    note: 'Powder Blue color rush is vastly more popular with Chargers fans than standard navy. The Chargers\' powder blue identity predates the current branding and is considered their true colors by a significant portion of the fan base.',
    cultureTag: "Broltchachos",
    cry:        "Bolt Up",
    wardRoom:   "Chargers don't ask permission.",
  },

  // ─── NFC East ─────────────────────────────────────────────────────────────
  {
    abbr: 'DAL', city: 'Dallas',       name: 'Cowboys',
    div: 'NFC East',  primary: '#003594', secondary: '#869397',
    accent: '#003594', scheme: 'standard', template: 1,
    cultureTag: "America's Team",
    cry:        "We Dem Boyz",
    wardRoom:   "How 'Bout Them Cowboys.",
  },
  {
    abbr: 'NYG', city: 'New York',     name: 'Giants',
    div: 'NFC East',  primary: '#0B2265', secondary: '#A71930',
    accent: '#A71930', scheme: 'secondary', template: 1,
    note: 'Giants red (#A71930) is vibrant and distinctive. Standard navy (#0B2265) is extremely dark.',
    cultureTag: "Big Blue",
    cry:        "GO Big Blue",
    wardRoom:   "Fe-Fi-Fo-Fum.",
    lore:       "Giants don't sleep.",
  },
  {
    abbr: 'PHI', city: 'Philadelphia', name: 'Eagles',
    div: 'NFC East',  primary: '#004C54', secondary: '#A5ACAF',
    accent: '#004C54', scheme: 'standard', template: 2,
    // Midnight Green IS the Eagles identity. textSafe lifts it to readable.
    cultureTag: "Birds Gang",
    cry:        "Fly Eagles Fly",
    wardRoom:   "No one likes us, we don't care.",
  },
  {
    abbr: 'WAS', city: 'Washington',   name: 'Commanders',
    div: 'NFC East',  primary: '#5A1414', secondary: '#FFB612',
    accent: '#FFB612', scheme: 'secondary', template: 2,
    note: 'Commanders gold (#FFB612) pops on dark UI. Dark maroon (#5A1414) is distinctive but textSafe is less effective on warm darks.',
    cultureTag: "District",
    cry:        "Hail Victory",
    wardRoom:   "The District doesn't kneel.",
  },

  // ─── NFC North ────────────────────────────────────────────────────────────
  {
    abbr: 'CHI', city: 'Chicago',      name: 'Bears',
    div: 'NFC North', primary: '#0B162A', secondary: '#C83803',
    accent: '#C83803', scheme: 'secondary', template: 1,
    note: 'Bears orange (#C83803) is the real visible identity. Standard primary (#0B162A) is near-black and would vanish on Corvus dark UI.',
    cultureTag: "Da Bears",
    cry:        "Bear Down",
    wardRoom:   "Good, better, best. Never rest.",
  },
  {
    abbr: 'DET', city: 'Detroit',      name: 'Lions',
    div: 'NFC North', primary: '#0076B6', secondary: '#B0B7BC',
    accent: '#0076B6', scheme: 'standard', template: 1,
    cultureTag: "One Pride",
    cry:        "Detroit vs. Everybody",
    wardRoom:   "The city always shows up.",
  },
  {
    abbr: 'GB',  city: 'Green Bay',    name: 'Packers',
    div: 'NFC North', primary: '#203731', secondary: '#FFB612',
    accent: '#FFB612', scheme: 'secondary', template: 2,
    note: 'Packers gold (#FFB612) is equally iconic as the green and more vibrant on a dark UI. Forest green textSafe-lifted works but gold is more instantly Packer.',
    cultureTag: "Cheesehead Nation",
    cry:        "Go You Packers Go",
    wardRoom:   "Titletown.",
    lore:       "The Bears still suck.",
  },
  {
    abbr: 'MIN', city: 'Minnesota',    name: 'Vikings',
    div: 'NFC North', primary: '#4F2683', secondary: '#FFC62F',
    accent: '#4F2683', scheme: 'standard', template: 2,
    cultureTag: "Skol Vikings",
    cry:        "Skol",
    wardRoom:   "The Bold North doesn't forget.",
  },

  // ─── NFC South ────────────────────────────────────────────────────────────
  {
    abbr: 'ATL', city: 'Atlanta',      name: 'Falcons',
    div: 'NFC South', primary: '#A71930', secondary: '#000000',
    accent: '#A71930', scheme: 'standard', template: 6,
    cultureTag: "Rise Up",
    cry:        "Rise Up",
    wardRoom:   "The City Too Busy to Hate.",
    lore:       "F.I.L.A.",
  },
  {
    abbr: 'CAR', city: 'Carolina',     name: 'Panthers',
    div: 'NFC South', primary: '#0085CA', secondary: '#101820',
    accent: '#0085CA', scheme: 'standard', template: 1,
    cultureTag: "Keep Pounding",
    cry:        "Keep Pounding",
    wardRoom:   "Carolina never stops running.",
  },
  {
    abbr: 'NO',  city: 'New Orleans',  name: 'Saints',
    div: 'NFC South', primary: '#D3BC8D', secondary: '#101820',
    accent: '#D3BC8D', scheme: 'standard', template: 2,
    cultureTag: "Who Dat Nation",
    cry:        "Who Dat",
    wardRoom:   "Laissez les bons temps rouler.",
  },
  {
    abbr: 'TB',  city: 'Tampa Bay',    name: 'Buccaneers',
    div: 'NFC South', primary: '#D50A0A', secondary: '#FF7900',
    accent: '#D50A0A', scheme: 'standard', template: 3,
    cultureTag: "Krewe",
    cry:        "Fire the Cannons",
    wardRoom:   "No Risk It, No Biscuit.",
  },

  // ─── NFC West ─────────────────────────────────────────────────────────────
  {
    abbr: 'ARI', city: 'Arizona',      name: 'Cardinals',
    div: 'NFC West',  primary: '#97233F', secondary: '#FFB612',
    accent: '#97233F', scheme: 'standard', template: 3,
    cultureTag: "Red Sea",
    cry:        "Be Water",
    wardRoom:   "Red Sea rising.",
  },
  {
    abbr: 'LAR', city: 'Los Angeles',  name: 'Rams',
    div: 'NFC West',  primary: '#003594', secondary: '#FFA300',
    accent: '#FFA300', scheme: 'secondary', template: 2,
    note: 'Rams gold/bone (#FFA300) is the distinctive modern Rams color. Standard navy is dark and shared with other franchises.',
    cultureTag: "Rams House",
    cry:        "Whose House",
    wardRoom:   "Whose House? Rams House.",
    lore:       "Horns Up.",
  },
  {
    abbr: 'SF',  city: 'San Francisco', name: '49ers',
    div: 'NFC West',  primary: '#AA0000', secondary: '#B3995D',
    accent: '#AA0000', scheme: 'standard', template: 2,
    cultureTag: "Gold Rush",
    cry:        "Bang Bang Niner Gang",
    wardRoom:   "Faithful to The Bay.",
  },
  {
    abbr: 'SEA', city: 'Seattle',      name: 'Seahawks',
    div: 'NFC West',  primary: '#002244', secondary: '#69BE28',
    accent: '#69BE28', scheme: 'secondary', template: 1,
    note: "Seahawks Action Green (#69BE28) is their most distinctive color and instantly recognizable. Standard navy is very dark and shared with other teams.",
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
 * Lift a color's lightness to at least `minL` for use as text on dark bg.
 * Preserves hue + saturation; only raises L when it's too dark.
 * Also nudges saturation up if very desaturated, so it still reads as team color.
 */
export function textSafe(hex, minL = 58) {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return hslToHex(h, Math.max(s, 38), Math.max(l, minL));
}

/**
 * Return the best foreground color (#0A0A0B dark or #F5F0E8 light)
 * for text printed ON TOP of the given background hex.
 */
export function readableOn(hex) {
  return relLum(hexToRgb(hex)) > 0.45 ? '#0A0A0B' : '#F5F0E8';
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
 */
export function getTeamTheme(abbr) {
  if (!abbr) {
    return { accentBg: '#B8952A', accentText: '#B8952A', accentOn: '#0A0A0B' };
  }
  const team = NFL_TEAMS.find((t) => t.abbr === abbr);
  if (!team) return getTeamTheme(null);

  const accentBg = team.accent;
  const accentText = textSafe(accentBg);
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
