import { assertCategoryShape } from '../lib/assertCategoryShape.js';
import { MOMENT_DATES } from './nflCalendar.js';

/**
 * nflTeams.js — NFL team multi-color palettes (Phase 1.5h).
 *
 * Each team has a `palettes` array with at least one Official entry, plus
 * optional Special cultural variants (Stankonia, Calle Ocho, Paisley Park,
 * etc.). Every palette carries 3-5 named colors with explicit UI roles, and
 * an explicit `surfaceRole` that names which role lives at the page surface.
 *
 * Doctrine reversal from Phase 1.5e–1.5f:
 *
 *   - No stylistic dark-mode-on-team-accent. The page is dark when the
 *     team's surface color is dark (PIT black, BAL purple, ATL Stankonia),
 *     light when the team's surface color is light (KC white, MIA Calle
 *     pastel, IND horseshoe white). Justin doctrine 2026-06-21.
 *
 *   - Every team must surface its full official palette on every themed
 *     page (no more single-accent rendering). Identity copy, swatches,
 *     CTAs, hairlines, and motif flourishes all draw from different palette
 *     roles. Designer license to add 1-2 utility colors per palette for
 *     legibility where the official palette can't carry it.
 *
 *   - Special cultural variants tied to the team's region/music/food/
 *     history — no Nike/Jordan trademarks. Examples: ATL "Stankonia"
 *     (OutKast 2000 album), MIA "Calle Ocho" (Little Havana street),
 *     MIN "Paisley Park" (Prince's estate), DET "8 Mile" (Eminem / Motor
 *     City), NO "Mardi Gras" (Krewe palette), TB "Gasparilla" (annual
 *     pirate festival), etc.
 *
 *   Doctrine-vocabulary mapping (2026-07-03 fan-experience doctrine v1):
 *     mode: 'official' <-> "War Room" primary skin - inside, institutional, chants as curated art
 *     mode: 'special'  <-> "Color Rush" alt skin - outside, city on game day, chants as graffiti
 *
 *   Doctrine reference: slops-saloon/Direction/decisions/slops-saloon-fan-experience-doctrine-v1.md
 *   Colorway spec:      slops-saloon/Blueprints/specs/team-colorway-system-spec-v1.md
 *   Chant spec:         slops-saloon/Blueprints/specs/chant-and-fan-copy-spec-v1.md
 *
 * ── Schema ─────────────────────────────────────────────────────────────────
 *
 *   team.palettes: [{ mode, name, surfaceRole, colors[], culturalAnchor? }]
 *
 *     mode: 'official' | 'special'       (every team has 'official'; 30/32
 *                                          also have a 'special')
 *     name: string                       display name on Appearance picker
 *     surfaceRole: 'primary'|'secondary'|'tertiary'|'neutral'|'mute'
 *                                        which palette role IS the page
 *                                        surface (--color-bg). Drives whether
 *                                        the page reads light or dark, as a
 *                                        consequence of the team's actual
 *                                        canonical world color.
 *     colors: [{ hex, name, role }]
 *       hex: '#RRGGBB'
 *       name: friendly name surfaced in swatch labels ('Chiefs Red',
 *             'Paisley Purple', 'Sin City Red', etc.)
 *       role: 'primary'    — dominant brand color (CTA fills, headline accents)
 *             'secondary'  — second brand color (section headers, focus rings)
 *             'tertiary'   — optional third (chip bg, optional flourish)
 *             'neutral'    — white/cream/parchment (text on dark surface, frame on light)
 *             'mute'       — black or near-black (hairlines, depth, text on light)
 *             'accent-pop' — optional hover/active flourish
 *     culturalAnchor: { name, year?, kind } | null
 *       kind ∈ 'film' | 'music' | 'art' | 'region' | 'history' | 'tradition'
 *
 * ── Existing identity copy (unchanged) ────────────────────────────────────
 *
 *   cultureTag  — 1–3 word fan identity label (pill/badge)
 *   cry         — the chant; short, punchy, what they yell in the stadium
 *   wardRoom    — one-liner war room statement; harder, what the GM says
 *   lore?       — optional deeper fan culture line for teams with more to say
 *
 *   These remain constant across palette modes — the fan voice doesn't change
 *   when the visual chrome changes.
 *
 * ── Retired fields (don't reintroduce) ────────────────────────────────────
 *
 *   primary, secondary, accent, scheme, template, surfaceAxis, surfaceFrom,
 *   accentLifted, colorRush, note — all replaced by the `palettes` array.
 */

export const NFL_TEAMS = [
  // ─── AFC East ─────────────────────────────────────────────────────────────
  {
    abbr: 'BUF', city: 'Buffalo', name: 'Bills', div: 'AFC East',
    palettes: [
      {
        mode: 'official', name: 'Bills', surfaceRole: 'primary',
        colors: [
          { hex: '#00338D', name: 'Royal Blue',  role: 'primary' },
          { hex: '#C60C30', name: 'Bills Red',   role: 'secondary' },
          { hex: '#F5F0E8', name: 'Game-Day White', role: 'neutral' },
          { hex: '#0A1426', name: 'Stadium Night', role: 'mute' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Wing Sauce', surfaceRole: 'neutral',
        colors: [
          { hex: '#D62828', name: "Frank's Red",   role: 'primary' },
          { hex: '#0B3E92', name: 'Blue Cheese',   role: 'secondary' },
          { hex: '#FAF6E8', name: 'Ranch Cream',   role: 'neutral' },
          { hex: '#3D2A1C', name: 'Charred Wing',  role: 'mute' },
          { hex: '#7B8A4E', name: 'Celery Side',   role: 'accent-pop' },
        ],
        culturalAnchor: { name: 'Buffalo wings', kind: 'tradition' },
      },
    ],
    cultureTag: 'Bills Mafia',
    cry:        'Everybody Eats',
    wardRoom:   "Mafia don't leave their own.",
  },
  {
    abbr: 'MIA', city: 'Miami', name: 'Dolphins', div: 'AFC East',
    palettes: [
      {
        mode: 'official', name: 'Dolphins', surfaceRole: 'neutral',
        colors: [
          { hex: '#008E97', name: 'Aqua',          role: 'primary' },
          { hex: '#FC4C02', name: 'Coral Orange',  role: 'secondary' },
          { hex: '#005778', name: 'Atlantic Blue', role: 'tertiary' },
          { hex: '#FDF8F2', name: 'Beach Sand',    role: 'neutral' },
          { hex: '#0A1F25', name: 'Reef Black',    role: 'mute' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Calle Ocho', surfaceRole: 'neutral',
        colors: [
          { hex: '#E91E63', name: 'Tropico Pink',  role: 'primary' },
          { hex: '#00ACA6', name: 'Calle Aqua',    role: 'secondary' },
          { hex: '#FAEFD6', name: 'Pastel Cream',  role: 'neutral' },
          { hex: '#3E2723', name: 'Cuban Cigar',   role: 'mute' },
          { hex: '#F9A825', name: 'Mango Stand',   role: 'accent-pop' },
        ],
        culturalAnchor: { name: 'Calle Ocho / Little Havana', kind: 'region' },
      },
    ],
    cultureTag: 'The 305',
    cry:        'Fins Up',
    wardRoom:   '305 never sleeps.',
    motifs: [
      {
        id: 'mia-aqua-hairline',
        kind: 'hairline',
        shape: 'double',
        thicknessPx: 1,
        colorRole: 'primary',
        opacity: { dark: 0.6, light: 0.45 },
        appliesTo: ['page-edge'],
        excludesOmenCard: true,
        reducedMotionFallback: 'identical',
        trademarkReview: 'self-assessed',
      },
    ],
  },
  {
    abbr: 'NE', city: 'New England', name: 'Patriots', div: 'AFC East',
    palettes: [
      {
        mode: 'official', name: 'Patriots', surfaceRole: 'primary',
        colors: [
          { hex: '#002244', name: 'Patriot Navy',  role: 'primary' },
          { hex: '#C60C30', name: 'Patriot Red',   role: 'secondary' },
          { hex: '#B0B7BC', name: 'Silver',        role: 'tertiary' },
          { hex: '#F5F0E8', name: 'Game White',    role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Bunker Hill', surfaceRole: 'neutral',
        colors: [
          { hex: '#274075', name: 'Continental Navy', role: 'primary' },
          { hex: '#9C2A28', name: 'Brick Crimson',    role: 'secondary' },
          { hex: '#F0E9D6', name: 'Parchment',        role: 'neutral' },
          { hex: '#7A7E83', name: 'Musket Steel',     role: 'mute' },
        ],
        culturalAnchor: { name: 'Battle of Bunker Hill', year: 1775, kind: 'history' },
      },
    ],
    cultureTag: 'Pats Nation',
    cry:        'Do Your Job',
    wardRoom:   'We all we got, we all we need.',
    typeFlourishes: [
      {
        id: 'ne-engraved-eyebrow',
        scope: 'eyebrow',
        family: 'Alegreya Sans',
        weight: 600,
        style: 'normal',
        variantCaps: 'small-caps',
        tracking: '0.12em',
        fontFeatures: '"smcp" 1',
        enabledInVariant: ['official', 'special'],
        reducedMotion: 'no-change',
      },
    ],
  },
  {
    abbr: 'NYJ', city: 'New York', name: 'Jets', div: 'AFC East',
    palettes: [
      {
        mode: 'official', name: 'Jets', surfaceRole: 'primary',
        colors: [
          { hex: '#125740', name: 'Pine Green',    role: 'primary' },
          { hex: '#F5F0E8', name: 'Jets White',    role: 'neutral' },
          { hex: '#0A1A14', name: 'Hangar Black',  role: 'mute' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Hempstead Green', surfaceRole: 'primary',
        colors: [
          { hex: '#062017', name: 'Hempstead Pine', role: 'primary' },
          { hex: '#7A8488', name: 'Runway Grey',    role: 'secondary' },
          { hex: '#F5F1E8', name: 'Long Beach Cream', role: 'neutral' },
          { hex: '#0A1A2A', name: 'Atlantic Navy',  role: 'mute' },
        ],
        culturalAnchor: { name: 'Hempstead / Long Island', kind: 'region' },
      },
    ],
    cultureTag: 'Gang Green',
    cry:        'J-E-T-S',
    wardRoom:   "Gang Green don't blink.",
  },

  // ─── AFC North ────────────────────────────────────────────────────────────
  {
    abbr: 'BAL', city: 'Baltimore', name: 'Ravens', div: 'AFC North',
    palettes: [
      {
        mode: 'official', name: 'Ravens', surfaceRole: 'primary',
        colors: [
          { hex: '#241773', name: 'Ravens Purple', role: 'primary' },
          { hex: '#9E7C0C', name: 'Battle Gold',   role: 'secondary' },
          { hex: '#0A0A0B', name: 'Raven Black',   role: 'mute' },
          { hex: '#F0EDDC', name: 'Stadium Cream', role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: "Poe's Raven", surfaceRole: 'mute',
        colors: [
          { hex: '#592899', name: 'Concord Violet', role: 'primary' },
          { hex: '#B89F37', name: 'Brass Cup',      role: 'secondary' },
          { hex: '#080608', name: 'Raven Black',    role: 'mute' },
          { hex: '#F2EDDA', name: 'Old Parchment',  role: 'neutral' },
        ],
        culturalAnchor: { name: "Edgar Allan Poe's 'The Raven'", year: 1845, kind: 'art' },
      },
    ],
    cultureTag: 'The Flock',
    cry:        'Big Truzz',
    wardRoom:   'Play like a Raven.',
  },
  {
    abbr: 'CIN', city: 'Cincinnati', name: 'Bengals', div: 'AFC North',
    palettes: [
      {
        mode: 'official', name: 'Bengals', surfaceRole: 'mute',
        colors: [
          { hex: '#FB4F14', name: 'Bengal Orange', role: 'primary' },
          { hex: '#0A0A0B', name: 'Tiger Black',   role: 'mute' },
          { hex: '#F5F0E8', name: 'Tooth White',   role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Skyline Chili', surfaceRole: 'neutral',
        colors: [
          { hex: '#C2410C', name: 'Chili Red',     role: 'primary' },
          { hex: '#E9A23B', name: 'Cheddar Gold',  role: 'secondary' },
          { hex: '#FAF6E8', name: 'Onion Cream',   role: 'neutral' },
          { hex: '#2A1810', name: 'Cocoa Brown',   role: 'mute' },
        ],
        culturalAnchor: { name: 'Cincinnati Chili / Skyline', kind: 'tradition' },
      },
    ],
    cultureTag: 'The Jungle',
    cry:        'Who Dey',
    wardRoom:   'They gotta play us.',
  },
  // TODO(colorway-spec-v1): Add verified Color Rush palette via slops-saloon/Blueprints/specs/team-colorway-system-spec-v1.md Team Roster extended-roster author pass.
  {
    abbr: 'CLE', city: 'Cleveland', name: 'Browns', div: 'AFC North',
    palettes: [
      {
        mode: 'official', name: 'Browns', surfaceRole: 'primary',
        colors: [
          { hex: '#311D00', name: 'Dawg Brown',    role: 'primary' },
          { hex: '#FF3C00', name: 'Browns Orange', role: 'secondary' },
          { hex: '#F5F0E8', name: 'Game White',    role: 'neutral' },
        ],
        culturalAnchor: null,
      },
    ],
    cultureTag: 'Dawg Pound',
    cry:        'In Browns We Trust',
    wardRoom:   "Cleveland doesn't fold.",
  },
  {
    abbr: 'PIT', city: 'Pittsburgh', name: 'Steelers', div: 'AFC North',
    palettes: [
      {
        mode: 'official', name: 'Steelers', surfaceRole: 'primary',
        colors: [
          { hex: '#101820', name: 'Steeler Black', role: 'primary' },
          { hex: '#FFB612', name: 'Steeler Gold',  role: 'secondary' },
          { hex: '#C60C30', name: 'Logo Red',      role: 'tertiary' },
          { hex: '#003087', name: 'Steel Blue',    role: 'accent-pop' },
          { hex: '#F5F0E8', name: 'Locker White',  role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'US Steel', surfaceRole: 'primary',
        colors: [
          { hex: '#38404D', name: 'Coal Black',    role: 'primary' },
          { hex: '#FFB612', name: 'Molten Gold',   role: 'secondary' },
          { hex: '#1F5BA8', name: 'Steel-Mill Blue', role: 'tertiary' },
          { hex: '#B85C1F', name: 'Iron Ore',      role: 'accent-pop' },
          { hex: '#E5E2D8', name: 'Slag White',    role: 'neutral' },
        ],
        culturalAnchor: { name: 'US Steel logo origin', year: 1962, kind: 'history' },
      },
    ],
    cultureTag: 'Steeler Nation',
    cry:        'Here We Go',
    wardRoom:   'Redd up the war room.',
    lore:       'Stillers Nation.',
    motifs: [
      {
        id: 'pit-gold-hairline',
        kind: 'hairline',
        shape: 'solid',
        thicknessPx: 1,
        colorRole: 'secondary',
        opacity: { dark: 1, light: 1 },
        appliesTo: ['page-edge', 'section-divider'],
        excludesOmenCard: true,
        reducedMotionFallback: 'identical',
        trademarkReview: 'self-assessed',
      },
    ],
  },

  // ─── AFC South ────────────────────────────────────────────────────────────
  {
    abbr: 'HOU', city: 'Houston', name: 'Texans', div: 'AFC South',
    palettes: [
      {
        mode: 'official', name: 'Texans', surfaceRole: 'primary',
        colors: [
          { hex: '#03202F', name: 'Deep Steel Blue', role: 'primary' },
          { hex: '#A71930', name: 'Battle Red',      role: 'secondary' },
          { hex: '#F5F0E8', name: 'Lone Star White', role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Mission Control', surfaceRole: 'primary',
        colors: [
          { hex: '#0A1740', name: 'Mission Control Blue', role: 'primary' },
          { hex: '#C8102E', name: 'Console Red',          role: 'secondary' },
          { hex: '#F0EBE0', name: 'Readout Cream',        role: 'neutral' },
          { hex: '#E9A23B', name: 'Indicator Amber',      role: 'accent-pop' },
        ],
        culturalAnchor: { name: 'NASA Johnson Space Center', year: 1961, kind: 'history' },
      },
    ],
    cultureTag: 'Bull Pen',
    cry:        'Swarm',
    wardRoom:   'Texas does it bigger.',
  },
  {
    abbr: 'IND', city: 'Indianapolis', name: 'Colts', div: 'AFC South',
    palettes: [
      {
        mode: 'official', name: 'Colts', surfaceRole: 'neutral',
        colors: [
          { hex: '#002C5F', name: 'Speed Blue',  role: 'primary' },
          { hex: '#A2AAAD', name: 'Horseshoe Silver', role: 'secondary' },
          { hex: '#FAFAFA', name: 'Helmet White', role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Loud House', surfaceRole: 'neutral',
        colors: [
          { hex: '#00145F', name: 'Speed Blue',     role: 'primary' },
          { hex: '#C0C5C8', name: 'Lucas Chrome',   role: 'secondary' },
          { hex: '#FAFAFA', name: 'Spotlight White', role: 'neutral' },
          { hex: '#1A1A1A', name: 'Checker Black',  role: 'mute' },
        ],
        culturalAnchor: { name: 'Lucas Oil Stadium / "The Loud House"', kind: 'region' },
      },
    ],
    cultureTag: 'Horseshoe',
    cry:        'For The Shoe',
    wardRoom:   'The Loud House is calling.',
  },
  {
    abbr: 'JAX', city: 'Jacksonville', name: 'Jaguars', div: 'AFC South',
    palettes: [
      {
        mode: 'official', name: 'Jaguars', surfaceRole: 'primary',
        colors: [
          { hex: '#006778', name: 'Jaguar Teal', role: 'primary' },
          { hex: '#D7A22A', name: 'Coastal Gold', role: 'secondary' },
          { hex: '#0F1A1F', name: 'Cypress Black', role: 'mute' },
          { hex: '#F0EBDA', name: 'Marsh Cream', role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Marsh Teal', surfaceRole: 'primary',
        colors: [
          { hex: '#006E63', name: 'Marsh Teal',    role: 'primary' },
          { hex: '#D7A22A', name: 'Sunset Gold',   role: 'secondary' },
          { hex: '#0F1A1F', name: 'Cypress Black', role: 'mute' },
          { hex: '#EFE6CC', name: 'Reed Cream',    role: 'neutral' },
        ],
        culturalAnchor: { name: 'NE Florida marsh / St. Johns River', kind: 'region' },
      },
    ],
    cultureTag: 'Duval',
    cry:        'DUUUVAL',
    wardRoom:   "Get it right, this isn't Miami.",
  },
  {
    abbr: 'TEN', city: 'Tennessee', name: 'Titans', div: 'AFC South',
    palettes: [
      {
        mode: 'official', name: 'Titans', surfaceRole: 'primary',
        colors: [
          { hex: '#0C2340', name: 'Titan Navy',    role: 'primary' },
          { hex: '#4B92DB', name: 'Columbia Blue', role: 'secondary' },
          { hex: '#C8102E', name: 'Titan Flame',   role: 'accent-pop' },
          { hex: '#B0B7BC', name: 'Greek Silver',  role: 'tertiary' },
          { hex: '#F5F0E8', name: 'Toga White',    role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Music Row', surfaceRole: 'primary',
        colors: [
          { hex: '#143A6B', name: 'Nashville Navy', role: 'primary' },
          { hex: '#4B92DB', name: 'Honky-Tonk Blue', role: 'secondary' },
          { hex: '#D4A24C', name: 'Whiskey Amber', role: 'accent-pop' },
          { hex: '#0A0A0B', name: 'Stage Black',   role: 'mute' },
          { hex: '#F0EBE0', name: 'Cotton Cream',  role: 'neutral' },
        ],
        culturalAnchor: { name: 'Nashville Music Row', kind: 'music' },
      },
    ],
    cultureTag: 'Titan Up',
    cry:        'How Ya Feel?',
    wardRoom:   "Tennessee don't tap out.",
  },

  // ─── AFC West ─────────────────────────────────────────────────────────────
  {
    abbr: 'DEN', city: 'Denver', name: 'Broncos', div: 'AFC West',
    palettes: [
      {
        mode: 'official', name: 'Broncos', surfaceRole: 'primary',
        colors: [
          { hex: '#FB4F14', name: 'Broncos Orange', role: 'primary' },
          { hex: '#002244', name: 'Mountain Navy',  role: 'secondary' },
          { hex: '#F5F0E8', name: 'Snowcap White',  role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Mile High Sunset', surfaceRole: 'primary',
        colors: [
          { hex: '#BF3303', name: 'Sunset Orange',  role: 'primary' },
          { hex: '#002244', name: 'Mountain Navy',  role: 'secondary' },
          { hex: '#1F1A2C', name: 'Twilight Indigo', role: 'mute' },
          { hex: '#FCE5D0', name: 'Altitude Cream', role: 'neutral' },
        ],
        culturalAnchor: { name: 'Rocky Mountain sunset', kind: 'region' },
      },
    ],
    cultureTag: 'Broncos Country',
    cry:        'Mile High Magic',
    wardRoom:   'The altitude changes things.',
  },
  {
    abbr: 'KC', city: 'Kansas City', name: 'Chiefs', div: 'AFC West',
    palettes: [
      {
        mode: 'official', name: 'Chiefs', surfaceRole: 'neutral',
        colors: [
          { hex: '#E31837', name: 'Chiefs Red',   role: 'primary' },
          { hex: '#FFB81C', name: 'Kingdom Gold', role: 'secondary' },
          { hex: '#FFFFFF', name: 'Kingdom White', role: 'neutral' },
          { hex: '#1A1A1A', name: 'Arrowhead Night', role: 'mute' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Arrowhead BBQ', surfaceRole: 'neutral',
        colors: [
          { hex: '#7A1119', name: 'Smokehouse Red', role: 'primary' },
          { hex: '#FFB81C', name: 'Glaze Gold',     role: 'secondary' },
          { hex: '#2A1810', name: 'Smoke Char',     role: 'mute' },
          { hex: '#F5E6C8', name: 'Pit Paper',      role: 'neutral' },
        ],
        culturalAnchor: { name: 'KC barbecue smokehouse', kind: 'tradition' },
      },
    ],
    cultureTag: 'Chiefs Kingdom',
    cry:        'Never a Doubt',
    wardRoom:   "Kingdom don't fold.",
  },
  {
    abbr: 'LV', city: 'Las Vegas', name: 'Raiders', div: 'AFC West',
    palettes: [
      {
        mode: 'official', name: 'Raiders', surfaceRole: 'primary',
        colors: [
          { hex: '#0A0A0B', name: 'Raider Black', role: 'primary' },
          { hex: '#A5ACAF', name: 'Raider Silver', role: 'secondary' },
          { hex: '#FAFAFA', name: 'Helmet White',  role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Black Hole', surfaceRole: 'primary',
        colors: [
          { hex: '#2E2E33', name: 'Black Hole',    role: 'primary' },
          { hex: '#C8CDCF', name: 'Strip Chrome',  role: 'secondary' },
          { hex: '#C8102E', name: 'Sin City Red',  role: 'accent-pop' },
          { hex: '#FAFAFA', name: 'Spotlight White', role: 'neutral' },
        ],
        culturalAnchor: { name: 'The Black Hole (Raiders fan section)', kind: 'tradition' },
      },
    ],
    cultureTag: 'Raider Nation',
    cry:        'Just Win Baby',
    wardRoom:   "The Autumn Wind don't stop.",
  },
  {
    abbr: 'LAC', city: 'Los Angeles', name: 'Chargers', div: 'AFC West',
    palettes: [
      {
        mode: 'official', name: 'Chargers', surfaceRole: 'neutral',
        colors: [
          { hex: '#0080C6', name: 'Powder Blue',  role: 'primary' },
          { hex: '#FFC20E', name: 'Sunshine Gold', role: 'secondary' },
          { hex: '#002A5E', name: 'Pacific Navy',  role: 'tertiary' },
          { hex: '#FBF1D4', name: 'Sand Cream',    role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Pacific Beach', surfaceRole: 'neutral',
        colors: [
          { hex: '#005F93', name: 'Beach Blue',   role: 'primary' },
          { hex: '#FFC20E', name: 'Bolt Yellow',  role: 'secondary' },
          { hex: '#FBF1D4', name: 'Sand Cream',   role: 'neutral' },
          { hex: '#002A5E', name: 'Pacific Navy', role: 'mute' },
        ],
        culturalAnchor: { name: '1960s San Diego beach Chargers', kind: 'tradition' },
      },
    ],
    cultureTag: 'Broltchachos',
    cry:        'Bolt Up',
    wardRoom:   "Chargers don't ask permission.",
  },

  // ─── NFC East ─────────────────────────────────────────────────────────────
  {
    abbr: 'DAL', city: 'Dallas', name: 'Cowboys', div: 'NFC East',
    palettes: [
      {
        mode: 'official', name: 'Cowboys', surfaceRole: 'neutral',
        colors: [
          { hex: '#003594', name: 'Cowboys Royal', role: 'primary' },
          { hex: '#869397', name: 'Helmet Silver', role: 'secondary' },
          { hex: '#041E42', name: 'Sideline Navy', role: 'tertiary' },
          { hex: '#F5F0E8', name: 'Lone Star White', role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Tom Landry', surfaceRole: 'neutral',
        colors: [
          { hex: '#869397', name: 'Fedora Silver',  role: 'primary' },
          { hex: '#003594', name: 'Sideline Navy',  role: 'secondary' },
          { hex: '#F0F0F0', name: 'Stadium Cream',  role: 'neutral' },
          { hex: '#1A1F2E', name: 'Coach Suit',     role: 'mute' },
        ],
        culturalAnchor: { name: 'Tom Landry sideline era', year: 1960, kind: 'history' },
      },
    ],
    cultureTag: "America's Team",
    cry:        'We Dem Boyz',
    wardRoom:   "How 'Bout Them Cowboys.",
  },
  {
    abbr: 'NYG', city: 'New York', name: 'Giants', div: 'NFC East',
    palettes: [
      {
        mode: 'official', name: 'Giants', surfaceRole: 'primary',
        colors: [
          { hex: '#0B2265', name: 'Big Blue',    role: 'primary' },
          { hex: '#A71930', name: 'Giants Red',  role: 'secondary' },
          { hex: '#8C9094', name: 'Empire Gray', role: 'tertiary' },
          { hex: '#F5F0E8', name: 'Game White',  role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Empire State', surfaceRole: 'primary',
        colors: [
          { hex: '#103193', name: 'Empire Blue',  role: 'primary' },
          { hex: '#A71930', name: 'Top-Tier Red', role: 'secondary' },
          { hex: '#8C9094', name: 'Steel Gray',   role: 'mute' },
          { hex: '#EFEAE0', name: 'Limestone Cream', role: 'neutral' },
        ],
        culturalAnchor: { name: 'Empire State Building floodlights', kind: 'region' },
      },
    ],
    cultureTag: 'Big Blue',
    cry:        'GO Big Blue',
    wardRoom:   'Fe-Fi-Fo-Fum.',
    lore:       "Giants don't sleep.",
  },
  {
    abbr: 'PHI', city: 'Philadelphia', name: 'Eagles', div: 'NFC East',
    palettes: [
      {
        mode: 'official', name: 'Eagles', surfaceRole: 'primary',
        colors: [
          { hex: '#004C54', name: 'Midnight Green', role: 'primary' },
          { hex: '#A5ACAF', name: 'Eagles Silver',  role: 'secondary' },
          { hex: '#000000', name: 'Eagles Black',   role: 'mute' },
          { hex: '#F5F0E8', name: 'Game White',     role: 'neutral' },
          { hex: '#565A5C', name: 'Stadium Charcoal', role: 'tertiary' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Liberty Bell', surfaceRole: 'primary',
        colors: [
          { hex: '#003754', name: 'Liberty Green',  role: 'primary' },
          { hex: '#C8A44A', name: 'Bell Brass',     role: 'secondary' },
          { hex: '#F0E9D6', name: 'Independence Cream', role: 'neutral' },
          { hex: '#4A4F52', name: 'Hall Stone',     role: 'mute' },
        ],
        culturalAnchor: { name: 'Liberty Bell / Independence Hall', year: 1751, kind: 'history' },
      },
    ],
    cultureTag: 'Bird Gang',
    cry:        'Fly Eagles Fly',
    wardRoom:   "No one likes us, we don't care.",
  },
  {
    abbr: 'WAS', city: 'Washington', name: 'Commanders', div: 'NFC East',
    palettes: [
      {
        mode: 'official', name: 'Commanders', surfaceRole: 'primary',
        colors: [
          { hex: '#5A1414', name: 'Commanders Burgundy', role: 'primary' },
          { hex: '#FFB612', name: 'Commanders Gold',     role: 'secondary' },
          { hex: '#0A0A0B', name: 'Embassy Black',       role: 'mute' },
          { hex: '#F5F0E8', name: 'Capitol White',       role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Go-Go Burgundy', surfaceRole: 'primary',
        colors: [
          { hex: '#841D1D', name: 'Go-Go Burgundy', role: 'primary' },
          { hex: '#FFB612', name: 'Cymbal Gold',    role: 'secondary' },
          { hex: '#0F0F12', name: 'Night Show',     role: 'mute' },
          { hex: '#E8DCC6', name: 'Conga Tan',      role: 'neutral' },
        ],
        culturalAnchor: { name: 'DC Go-Go music', year: 1976, kind: 'music' },
      },
    ],
    cultureTag: 'District',
    cry:        'Hail Victory',
    wardRoom:   "The District doesn't kneel.",
  },

  // ─── NFC North ────────────────────────────────────────────────────────────
  {
    abbr: 'CHI', city: 'Chicago', name: 'Bears', div: 'NFC North',
    palettes: [
      {
        mode: 'official', name: 'Bears', surfaceRole: 'primary',
        colors: [
          { hex: '#0B162A', name: 'Bears Navy',  role: 'primary' },
          { hex: '#C83803', name: 'Bears Orange', role: 'secondary' },
          { hex: '#F5F0E8', name: 'Game White',  role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: "'85 Bears", surfaceRole: 'primary',
        colors: [
          { hex: '#162B52', name: 'Sweetness Navy',  role: 'primary' },
          { hex: '#C83803', name: 'Payton Orange',   role: 'secondary' },
          { hex: '#1F2A1A', name: 'Soldier Field Grass', role: 'mute' },
          { hex: '#EAE2C9', name: 'Chalkboard Cream', role: 'neutral' },
        ],
        culturalAnchor: { name: '1985 Bears / Walter Payton', year: 1985, kind: 'history' },
      },
    ],
    cultureTag: 'Da Bears',
    cry:        'Bear Down',
    wardRoom:   'Good, better, best. Never rest.',
  },
  {
    abbr: 'DET', city: 'Detroit', name: 'Lions', div: 'NFC North',
    palettes: [
      {
        mode: 'official', name: 'Lions', surfaceRole: 'primary',
        colors: [
          { hex: '#0076B6', name: 'Honolulu Blue', role: 'primary' },
          { hex: '#B0B7BC', name: 'Lions Silver',  role: 'secondary' },
          { hex: '#0A0A0B', name: 'Lions Black',   role: 'mute' },
          { hex: '#F5F0E8', name: 'Game White',    role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: '8 Mile', surfaceRole: 'primary',
        colors: [
          { hex: '#005583', name: 'Honolulu Blue', role: 'primary' },
          { hex: '#A8AFB4', name: 'Mill Silver',   role: 'secondary' },
          { hex: '#1A1A1A', name: 'Concrete Black', role: 'mute' },
          { hex: '#EFEAE0', name: 'Diner Cream',   role: 'neutral' },
        ],
        culturalAnchor: { name: 'Motor City / 8 Mile', kind: 'region' },
      },
    ],
    cultureTag: 'One Pride',
    cry:        'Detroit vs. Everybody',
    wardRoom:   'The city always shows up.',
    // Thanksgiving Classic — the Lions have hosted on Thanksgiving since 1934.
    // Eyebrow uses `neutral` (Game White / Diner Cream): Lions Silver fails the
    // decorative contrast gate on the Honolulu Blue surface; the neutral clears
    // AA-large and the moment reads as a typographic label, not a hue swap.
    culturalMoments: [
      {
        id: 'det-thanksgiving-classic',
        label: 'Thanksgiving Classic',
        kind: 'calendar',
        activation: { rule: 'date-list', dates: MOMENT_DATES['det-thanksgiving-classic'] },
        overlay: {
          eyebrow: 'Thanksgiving Classic.',
          eyebrowColorRole: 'neutral',
          citation: 'Painted for the Thanksgiving Classic.',
        },
        scope: ['app', 'account', 'ledger', 'standings', 'football'],
        mockBadge: { required: true, copy: 'Thanksgiving chrome — decoration only, recommendations unchanged.' },
        reducedMotion: 'static-only',
      },
    ],
  },
  {
    abbr: 'GB', city: 'Green Bay', name: 'Packers', div: 'NFC North',
    palettes: [
      {
        mode: 'official', name: 'Packers', surfaceRole: 'primary',
        colors: [
          { hex: '#203731', name: 'Packers Green', role: 'primary' },
          { hex: '#FFB612', name: 'Packers Gold',  role: 'secondary' },
          { hex: '#F5F0E8', name: 'Locker White',  role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Lambeau Tundra', surfaceRole: 'primary',
        colors: [
          { hex: '#080D0B', name: 'Tundra Green',  role: 'primary' },
          { hex: '#FFB612', name: 'Sunset Gold',   role: 'secondary' },
          { hex: '#F0F4F4', name: 'Ice White',     role: 'neutral' },
          { hex: '#3A4642', name: 'Pole Steel',    role: 'mute' },
        ],
        culturalAnchor: { name: 'Lambeau Field tundra', kind: 'region' },
      },
    ],
    cultureTag: 'Cheesehead Nation',
    cry:        'Go You Packers Go',
    wardRoom:   'Titletown.',
    lore:       'The Bears still suck.',
    motifs: [
      {
        id: 'gb-gold-tundra-hairline',
        kind: 'hairline',
        shape: 'solid',
        thicknessPx: 1,
        colorRole: 'secondary',
        opacity: { dark: 0.92, light: 0.92 },
        appliesTo: ['section-divider'],
        excludesOmenCard: true,
        reducedMotionFallback: 'identical',
        trademarkReview: 'self-assessed',
      },
    ],
    // Lambeau Tundra — manual-flag only (no weather claim; activation is the
    // user flipping localStorage['omen.theme.moments']['gb-lambeau-tundra']).
    // Eyebrow copy is honest about manual activation per spec §v1 assignments.
    culturalMoments: [
      {
        id: 'gb-lambeau-tundra',
        label: 'Lambeau Tundra',
        kind: 'milestone',
        activation: { rule: 'manual-flag', storageKey: 'omen.theme.moments' },
        overlay: {
          eyebrow: 'Lambeau, manually painted.',
          eyebrowColorRole: 'secondary',
          citation: 'Painted for Lambeau.',
        },
        scope: ['app', 'account', 'football'],
        mockBadge: { required: true, copy: 'Lambeau chrome — decoration only, recommendations unchanged.' },
        reducedMotion: 'static-only',
      },
    ],
  },
  {
    abbr: 'MIN', city: 'Minnesota', name: 'Vikings', div: 'NFC North',
    palettes: [
      {
        mode: 'official', name: 'Vikings', surfaceRole: 'primary',
        colors: [
          { hex: '#4F2683', name: 'Vikings Purple', role: 'primary' },
          { hex: '#FFC62F', name: 'Vikings Gold',   role: 'secondary' },
          { hex: '#F5F0E8', name: 'Skol White',     role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Paisley Park', surfaceRole: 'primary',
        colors: [
          { hex: '#6731AB', name: 'Paisley Purple', role: 'primary' },
          { hex: '#FFC62F', name: 'Cymbal Gold',    role: 'secondary' },
          { hex: '#1F0A2C', name: 'Sign of the Times', role: 'mute' },
          { hex: '#EDE6F5', name: 'Pure Cream',     role: 'neutral' },
        ],
        culturalAnchor: { name: "Prince's Paisley Park / Minneapolis", kind: 'music' },
      },
    ],
    cultureTag: 'Skol Vikings',
    cry:        'Skol',
    wardRoom:   "The Bold North doesn't forget.",
  },

  // ─── NFC South ────────────────────────────────────────────────────────────
  {
    abbr: 'ATL', city: 'Atlanta', name: 'Falcons', div: 'NFC South',
    palettes: [
      {
        mode: 'official', name: 'Falcons', surfaceRole: 'mute',
        colors: [
          { hex: '#A71930', name: 'Falcon Red',    role: 'primary' },
          { hex: '#0A0A0B', name: 'Falcon Black',  role: 'mute' },
          { hex: '#A5ACAF', name: 'Falcon Silver', role: 'secondary' },
          { hex: '#F5F0E8', name: 'Game White',    role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Stankonia', surfaceRole: 'mute',
        colors: [
          { hex: '#A72619', name: 'Hartsfield Red', role: 'primary' },
          { hex: '#1A1A1A', name: 'A-Town Black',   role: 'mute' },
          { hex: '#C8A44A', name: 'Aquemini Gold',  role: 'secondary' },
          { hex: '#F0EBE0', name: 'Peach Cream',    role: 'neutral' },
        ],
        culturalAnchor: { name: "OutKast 'Stankonia'", year: 2000, kind: 'music' },
      },
    ],
    cultureTag: 'Rise Up',
    cry:        'Rise Up',
    wardRoom:   'The City Too Busy to Hate.',
    lore:       'F.I.L.A.',
  },
  {
    abbr: 'CAR', city: 'Carolina', name: 'Panthers', div: 'NFC South',
    palettes: [
      {
        mode: 'official', name: 'Panthers', surfaceRole: 'neutral',
        colors: [
          { hex: '#0085CA', name: 'Carolina Blue', role: 'primary' },
          { hex: '#101820', name: 'Panther Black', role: 'mute' },
          { hex: '#BFC0BF', name: 'Panther Silver', role: 'secondary' },
          { hex: '#FAFAF9', name: 'Carolina White', role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Tobacco Road', surfaceRole: 'neutral',
        colors: [
          { hex: '#006397', name: 'Carolina Blue', role: 'primary' },
          { hex: '#7B4F2E', name: 'Tobacco Brown', role: 'secondary' },
          { hex: '#FAF5E8', name: 'Cotton Cream',  role: 'neutral' },
          { hex: '#0F1A20', name: 'Tar Black',     role: 'mute' },
        ],
        culturalAnchor: { name: 'Tobacco Road / UNC heritage', kind: 'region' },
      },
    ],
    cultureTag: 'Keep Pounding',
    cry:        'Keep Pounding',
    wardRoom:   'Carolina never stops running.',
  },
  {
    abbr: 'NO', city: 'New Orleans', name: 'Saints', div: 'NFC South',
    palettes: [
      {
        mode: 'official', name: 'Saints', surfaceRole: 'mute',
        colors: [
          { hex: '#D3BC8D', name: 'Saints Gold', role: 'primary' },
          { hex: '#101820', name: 'Saints Black', role: 'mute' },
          { hex: '#F5F0E8', name: 'Game White',  role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Mardi Gras', surfaceRole: 'mute',
        colors: [
          { hex: '#5D2E8C', name: 'Krewe Purple', role: 'primary' },
          { hex: '#D3BC8D', name: 'Bourbon Gold', role: 'secondary' },
          { hex: '#3D8159', name: 'Bayou Green',  role: 'tertiary' },
          { hex: '#0F0F12', name: 'Bourbon Black', role: 'mute' },
          { hex: '#F5EFE0', name: 'Beignet Cream', role: 'neutral' },
        ],
        culturalAnchor: { name: 'Mardi Gras Krewe traditions', kind: 'tradition' },
      },
    ],
    cultureTag: 'Who Dat Nation',
    cry:        'Who Dat',
    wardRoom:   'Laissez les bons temps rouler.',
    motifs: [
      {
        id: 'no-cream-hairline',
        kind: 'hairline',
        shape: 'solid',
        thicknessPx: 1,
        colorRole: 'neutral',
        opacity: { dark: 0.9, light: 0.85 },
        appliesTo: ['page-edge'],
        excludesOmenCard: true,
        reducedMotionFallback: 'identical',
        trademarkReview: 'self-assessed',
      },
    ],
    // Mardi Gras Week — date-range 02-08 → 02-25, scope app + account only.
    // Eyebrow (`secondary`) + surface tint (`tertiary`) are roles present on
    // the Mardi Gras Special palette; on the Official palette those roles are
    // absent, so the moment gracefully suppresses (resolver no-op) — the
    // celebration chrome rides with the Mardi Gras variant by design.
    culturalMoments: [
      {
        id: 'no-mardi-gras',
        label: 'Mardi Gras Week',
        kind: 'calendar',
        activation: { rule: 'date-range', startMonthDay: '02-08', endMonthDay: '02-25' },
        overlay: {
          eyebrow: 'Mardi Gras week.',
          eyebrowColorRole: 'secondary',
          surfaceTintRole: 'tertiary',
          surfaceTintAlpha: 0.12,
          citation: 'Painted for Mardi Gras week.',
        },
        scope: ['app', 'account'],
        mockBadge: { required: true, copy: 'Mardi Gras chrome — chrome only, recommendations unchanged.' },
        reducedMotion: 'static-only',
      },
    ],
  },
  {
    abbr: 'TB', city: 'Tampa Bay', name: 'Buccaneers', div: 'NFC South',
    palettes: [
      {
        mode: 'official', name: 'Buccaneers', surfaceRole: 'mute',
        colors: [
          { hex: '#D50A0A', name: 'Buccaneer Red', role: 'primary' },
          { hex: '#34302B', name: 'Pirate Pewter', role: 'mute' },
          { hex: '#FF7900', name: 'Bay Orange',    role: 'secondary' },
          { hex: '#0A0A0B', name: 'Cannon Black',  role: 'tertiary' },
          { hex: '#FCE5C8', name: 'Sail Cream',    role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Gasparilla', surfaceRole: 'mute',
        colors: [
          { hex: '#34302B', name: 'Pirate Pewter', role: 'mute' },
          { hex: '#D50A0A', name: 'Cannon Red',    role: 'primary' },
          { hex: '#FF7900', name: 'Bay Orange',    role: 'secondary' },
          { hex: '#FCE5C8', name: 'Sail Cream',    role: 'neutral' },
        ],
        culturalAnchor: { name: 'Gasparilla pirate festival', kind: 'tradition' },
      },
    ],
    cultureTag: 'Krewe',
    cry:        'Fire the Cannons',
    wardRoom:   'No Risk It, No Biscuit.',
  },

  // ─── NFC West ─────────────────────────────────────────────────────────────
  {
    abbr: 'ARI', city: 'Arizona', name: 'Cardinals', div: 'NFC West',
    palettes: [
      {
        mode: 'official', name: 'Cardinals', surfaceRole: 'neutral',
        colors: [
          { hex: '#97233F', name: 'Cardinal Red', role: 'primary' },
          { hex: '#000000', name: 'Cardinals Black', role: 'mute' },
          { hex: '#FFB612', name: 'Cardinals Yellow', role: 'secondary' },
          { hex: '#FAFAF9', name: 'Cardinals White', role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Sonoran Sunset', surfaceRole: 'neutral',
        colors: [
          { hex: '#972423', name: 'Sedona Red',    role: 'primary' },
          { hex: '#1A1A1A', name: 'Mesa Silhouette', role: 'mute' },
          { hex: '#F0E0CC', name: 'Sandstone Cream', role: 'neutral' },
          { hex: '#4A6A3C', name: 'Saguaro Green', role: 'accent-pop' },
        ],
        culturalAnchor: { name: 'Sonoran Desert / Toro Bravo tradition', kind: 'region' },
      },
    ],
    cultureTag: 'Red Sea',
    cry:        'Be Water',
    wardRoom:   'Red Sea rising.',
  },
  // TODO(colorway-spec-v1): Add verified Color Rush palette via slops-saloon/Blueprints/specs/team-colorway-system-spec-v1.md Team Roster extended-roster author pass.
  {
    abbr: 'LAR', city: 'Los Angeles', name: 'Rams', div: 'NFC West',
    palettes: [
      {
        mode: 'official', name: 'Rams', surfaceRole: 'primary',
        colors: [
          { hex: '#003594', name: 'Rams Royal',   role: 'primary' },
          { hex: '#FFA300', name: 'Rams Sol',     role: 'secondary' },
          { hex: '#FFD100', name: 'Rams Bone',    role: 'tertiary' },
          { hex: '#F5F0E8', name: 'Hollywood White', role: 'neutral' },
        ],
        culturalAnchor: null,
      },
    ],
    cultureTag: 'Rams House',
    cry:        'Whose House',
    wardRoom:   'Whose House? Rams House.',
    lore:       'Horns Up.',
  },
  {
    abbr: 'SF', city: 'San Francisco', name: '49ers', div: 'NFC West',
    palettes: [
      {
        mode: 'official', name: '49ers', surfaceRole: 'primary',
        colors: [
          { hex: '#AA0000', name: '49ers Red',  role: 'primary' },
          { hex: '#B3995D', name: '49ers Gold', role: 'secondary' },
          { hex: '#0A0A0B', name: '49ers Black', role: 'mute' },
          { hex: '#F5F0E8', name: 'Faithful White', role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Gold Rush', surfaceRole: 'primary',
        colors: [
          { hex: '#770000', name: 'Miner Red',    role: 'primary' },
          { hex: '#B3995D', name: 'Placer Gold',  role: 'secondary' },
          { hex: '#3A2818', name: 'Slate Pickaxe', role: 'mute' },
          { hex: '#F0E6D2', name: 'Canvas Cream',  role: 'neutral' },
        ],
        culturalAnchor: { name: 'California Gold Rush', year: 1849, kind: 'history' },
      },
    ],
    cultureTag: 'Gold Rush',
    cry:        'Bang Bang Niner Gang',
    wardRoom:   'Faithful to The Bay.',
  },
  {
    abbr: 'SEA', city: 'Seattle', name: 'Seahawks', div: 'NFC West',
    palettes: [
      {
        mode: 'official', name: 'Seahawks', surfaceRole: 'primary',
        colors: [
          { hex: '#002244', name: 'College Navy', role: 'primary' },
          { hex: '#69BE28', name: 'Action Green', role: 'secondary' },
          { hex: '#A5A8AB', name: 'Wolf Grey',    role: 'tertiary' },
          { hex: '#F5F0E8', name: 'Sea Foam White', role: 'neutral' },
        ],
        culturalAnchor: null,
      },
      {
        mode: 'special', name: 'Pike Place Grunge', surfaceRole: 'primary',
        colors: [
          { hex: '#002F3F', name: 'Pike Navy',    role: 'primary' },
          { hex: '#69BE28', name: 'Action Green', role: 'secondary' },
          { hex: '#7A828A', name: 'Flannel Grey', role: 'tertiary' },
          { hex: '#0A0A0B', name: 'Sub Pop Black', role: 'mute' },
          { hex: '#F0EBE0', name: 'Espresso Foam', role: 'neutral' },
        ],
        culturalAnchor: { name: 'Pike Place Market / 1990s Seattle grunge', year: 1990, kind: 'music' },
      },
    ],
    cultureTag: 'The 12s',
    cry:        'SEA HAWKS',
    wardRoom:   "12s don't leave.",
  },
];

if (!import.meta.env || import.meta.env.DEV) {
  for (const team of NFL_TEAMS) assertCategoryShape(team);
}

// ── Color math utilities ───────────────────────────────────────────────────

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function relLum([r, g, b]) {
  return [r, g, b]
    .map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
}

export function contrastRatio(hexA, hexB) {
  const la = relLum(hexToRgb(hexA));
  const lb = relLum(hexToRgb(hexB));
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Pick the best foreground (dark or light cream) for text printed ON TOP
 * of the given background hex, by actual WCAG contrast comparison.
 */
export function readableOn(hex) {
  return contrastRatio('#0A0A0B', hex) >= contrastRatio('#F5F0E8', hex)
    ? '#0A0A0B'
    : '#F5F0E8';
}

/**
 * `readableOn` picks the better of two fixed anchors but has no floor of
 * its own -- for a genuinely mid-luminance surface (e.g. Lions blue,
 * #0076B6), neither black nor cream clears WCAG AA (best is 4.34:1),
 * so body text silently ships under the accessibility minimum. Founder
 * directive 2026-07-12: text legibility "can no longer slip... address it
 * no matter what." This is the tier-3 fallback in that hierarchy --
 * official/fixed anchors first, then a real computed shade that measurably
 * works, searched across the full grayscale so it stays a neutral, never a
 * team-tinted color.
 */
export function readableOnFloor(hex, floor = 4.5) {
  const anchor = readableOn(hex);
  if (contrastRatio(anchor, hex) >= floor) return anchor;
  let best = anchor;
  let bestRatio = contrastRatio(anchor, hex);
  for (let v = 0; v <= 255; v += 5) {
    const shade = '#' + [v, v, v].map((n) => n.toString(16).padStart(2, '0')).join('');
    const ratio = contrastRatio(shade, hex);
    if (ratio > bestRatio) { best = shade; bestRatio = ratio; }
  }
  return best;
}

/**
 * True when the color is dark enough to need the hairline-inset tile border.
 */
export function isDark(hex) {
  return relLum(hexToRgb(hex)) < 0.12;
}

// ── Palette lookups ───────────────────────────────────────────────────────

/**
 * Return the palette bundle for a team + variant. Falls back to 'official'
 * if the requested variant doesn't exist on the team. Returns null if the
 * team isn't found.
 *
 * Output shape:
 *   {
 *     mode, name, colors, byRole, surfaceRole, surface, culturalAnchor
 *   }
 *
 *   - `byRole` is { primary: color, secondary: color, ... } for O(1) lookup
 *   - `surface` is the color object assigned to surfaceRole
 *   - `culturalAnchor` is `{ name, year?, kind }` or null
 */
export function getTeamPalette(abbr, variant = 'official') {
  if (!abbr) return null;
  const team = NFL_TEAMS.find((t) => t.abbr === abbr);
  if (!team) return null;

  const palette =
    team.palettes.find((p) => p.mode === variant) ??
    team.palettes.find((p) => p.mode === 'official');
  if (!palette) return null;

  const byRole = {};
  for (const c of palette.colors) byRole[c.role] = c;

  return {
    mode: palette.mode,
    name: palette.name,
    colors: palette.colors,
    byRole,
    surfaceRole: palette.surfaceRole,
    surface: byRole[palette.surfaceRole] ?? palette.colors[0],
    culturalAnchor: palette.culturalAnchor,
  };
}

/**
 * Whether a team has a 'special' variant available (used to decide whether
 * to render the Official / Special sub-mode picker on /account/appearance).
 */
export function hasSpecialVariant(abbr) {
  if (!abbr) return false;
  const team = NFL_TEAMS.find((t) => t.abbr === abbr);
  return team?.palettes?.some((p) => p.mode === 'special') ?? false;
}

/**
 * Legacy compatibility shim — pre-1.5h code expected `team.primary` etc.
 * Returns the official-palette role mapping as a flat object. New code
 * should use getTeamPalette() directly.
 */
export function getTeamTheme(abbr) {
  if (!abbr) {
    return { accentBg: '#B8952A', accentText: '#B8952A', accentOn: '#0A0A0B' };
  }
  const palette = getTeamPalette(abbr, 'official');
  if (!palette) return getTeamTheme(null);

  const primary = palette.byRole.primary?.hex ?? '#B8952A';
  return {
    accentBg: primary,
    accentText: primary,
    accentOn: readableOn(primary),
  };
}

// ── Display lists ─────────────────────────────────────────────────────────

// Sorted by division for the "Show all 32" expand view
export const TEAMS_BY_DIV = [
  'AFC East', 'AFC North', 'AFC South', 'AFC West',
  'NFC East', 'NFC North', 'NFC South', 'NFC West',
].flatMap((div) => NFL_TEAMS.filter((t) => t.div === div));

// The 8 marquee teams shown in the initial (collapsed) grid
export const MARQUEE_ABBRS = ['KC', 'PHI', 'SF', 'DAL', 'BUF', 'BAL', 'DET', 'MIA'];
