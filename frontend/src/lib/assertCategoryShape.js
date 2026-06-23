const COLOR_ROLES = new Set(['primary', 'secondary', 'tertiary', 'neutral', 'mute', 'accent-pop']);
const MOTIF_KINDS = new Set(['hairline', 'divider', 'corner-ornament', 'watermark']);
const MOTIF_SHAPES = new Set(['solid', 'dashed', 'dotted', 'double']);
const MOTIF_TARGETS = new Set(['page-edge', 'card', 'section-divider', 'eyebrow']);
const TRADEMARK_STATES = new Set(['pending', 'counsel-approved', 'self-assessed']);

const TYPE_SCOPES = new Set(['eyebrow', 'page-title', 'section-header']);
const TYPE_FAMILIES = new Set(['Alegreya Sans', 'Alegreya']);
const TYPE_WEIGHTS = new Set([400, 500, 600, 700]);
const TYPE_STYLES = new Set(['normal', 'italic']);
const TYPE_CAPS = new Set(['normal', 'small-caps', 'all-small-caps']);
const TYPE_TRACKING = new Set(['-0.02em', '0', '0.02em', '0.04em', '0.08em', '0.12em']);
const TYPE_FEATURES = new Set(['"dlig" 1', '"hlig" 1', '"smcp" 1', '"dlig" 1, "hlig" 1']);
const TYPE_VARIANTS = new Set(['official', 'special']);

const MOMENT_KINDS = new Set(['calendar', 'rivalry-week', 'milestone']);
const MOMENT_SCOPES = new Set(['app', 'account', 'ledger', 'standings', 'football', 'draft']);

function fail(team, message) {
  throw new Error(`${team?.abbr ?? 'unknown team'} category shape invalid: ${message}`);
}

function optionalArray(team, key) {
  const value = team[key];
  if (value == null) return [];
  if (!Array.isArray(value)) fail(team, `${key} must be an array`);
  return value;
}

function assertString(team, value, field) {
  if (typeof value !== 'string' || value.length === 0) fail(team, `${field} must be a non-empty string`);
}

function assertNumberInRange(team, value, field, min, max) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < min || value > max) {
    fail(team, `${field} must be between ${min} and ${max}`);
  }
}

function assertEnum(team, value, field, allowed) {
  if (!allowed.has(value)) fail(team, `${field} has unsupported value ${String(value)}`);
}

function assertArrayValues(team, values, field, allowed) {
  if (!Array.isArray(values) || values.length === 0) fail(team, `${field} must be a non-empty array`);
  for (const value of values) assertEnum(team, value, field, allowed);
}

function assertMotifs(team) {
  for (const motif of optionalArray(team, 'motifs')) {
    assertString(team, motif.id, 'motif.id');
    assertEnum(team, motif.kind, 'motif.kind', MOTIF_KINDS);
    assertEnum(team, motif.shape, 'motif.shape', MOTIF_SHAPES);
    if (motif.ornamentSvgPath != null) assertString(team, motif.ornamentSvgPath, 'motif.ornamentSvgPath');
    assertEnum(team, motif.thicknessPx, 'motif.thicknessPx', new Set([1, 2, 3]));
    assertEnum(team, motif.colorRole, 'motif.colorRole', COLOR_ROLES);
    assertNumberInRange(team, motif.opacity?.dark, 'motif.opacity.dark', 0, 1);
    assertNumberInRange(team, motif.opacity?.light, 'motif.opacity.light', 0, 1);
    assertArrayValues(team, motif.appliesTo, 'motif.appliesTo', MOTIF_TARGETS);
    if (motif.excludesOmenCard !== true) fail(team, 'motif.excludesOmenCard must be true');
    if (motif.reducedMotionFallback !== 'identical') fail(team, 'motif.reducedMotionFallback must be identical');
    assertEnum(team, motif.trademarkReview, 'motif.trademarkReview', TRADEMARK_STATES);
  }
}

function assertTypeFlourishes(team) {
  for (const flourish of optionalArray(team, 'typeFlourishes')) {
    assertString(team, flourish.id, 'typeFlourish.id');
    assertEnum(team, flourish.scope, 'typeFlourish.scope', TYPE_SCOPES);
    assertEnum(team, flourish.family, 'typeFlourish.family', TYPE_FAMILIES);
    if (flourish.weight != null) assertEnum(team, flourish.weight, 'typeFlourish.weight', TYPE_WEIGHTS);
    if (flourish.style != null) assertEnum(team, flourish.style, 'typeFlourish.style', TYPE_STYLES);
    if (flourish.variantCaps != null) assertEnum(team, flourish.variantCaps, 'typeFlourish.variantCaps', TYPE_CAPS);
    if (flourish.tracking != null) assertEnum(team, flourish.tracking, 'typeFlourish.tracking', TYPE_TRACKING);
    if (flourish.fontFeatures != null) assertEnum(team, flourish.fontFeatures, 'typeFlourish.fontFeatures', TYPE_FEATURES);
    assertArrayValues(team, flourish.enabledInVariant, 'typeFlourish.enabledInVariant', TYPE_VARIANTS);
    if (flourish.style === 'italic' && flourish.weight === 700) {
      fail(team, 'italic-700 not loaded - extend @import or downgrade weight');
    }
    if (flourish.reducedMotion !== 'no-change') fail(team, 'typeFlourish.reducedMotion must be no-change');
  }
}

function assertActivation(team, activation) {
  if (!activation || typeof activation !== 'object') fail(team, 'culturalMoment.activation is required');
  if (activation.rule === 'date-range') {
    assertString(team, activation.startMonthDay, 'culturalMoment.activation.startMonthDay');
    assertString(team, activation.endMonthDay, 'culturalMoment.activation.endMonthDay');
    return;
  }
  if (activation.rule === 'date-list') {
    if (!Array.isArray(activation.dates) || activation.dates.length === 0) {
      fail(team, 'culturalMoment.activation.dates must be non-empty');
    }
    for (const date of activation.dates) assertString(team, date, 'culturalMoment.activation.dates[]');
    return;
  }
  if (activation.rule === 'manual-flag') {
    assertString(team, activation.storageKey, 'culturalMoment.activation.storageKey');
    return;
  }
  fail(team, `culturalMoment.activation.rule has unsupported value ${String(activation.rule)}`);
}

function assertCulturalMoments(team) {
  for (const moment of optionalArray(team, 'culturalMoments')) {
    assertString(team, moment.id, 'culturalMoment.id');
    assertString(team, moment.label, 'culturalMoment.label');
    assertEnum(team, moment.kind, 'culturalMoment.kind', MOMENT_KINDS);
    assertActivation(team, moment.activation);
    assertString(team, moment.overlay?.eyebrow, 'culturalMoment.overlay.eyebrow');
    assertEnum(team, moment.overlay?.eyebrowColorRole, 'culturalMoment.overlay.eyebrowColorRole', COLOR_ROLES);
    if (moment.overlay?.surfaceTintRole != null) {
      assertEnum(team, moment.overlay.surfaceTintRole, 'culturalMoment.overlay.surfaceTintRole', COLOR_ROLES);
    }
    if (moment.overlay?.surfaceTintAlpha != null) {
      assertNumberInRange(team, moment.overlay.surfaceTintAlpha, 'culturalMoment.overlay.surfaceTintAlpha', 0, 0.18);
    }
    assertArrayValues(team, moment.scope, 'culturalMoment.scope', MOMENT_SCOPES);
    if (moment.scope.includes('omen') || moment.scope.includes('trade')) {
      fail(team, 'culturalMoment.scope must not include omen or trade');
    }
    if (moment.mockBadge?.required !== true) fail(team, 'culturalMoment.mockBadge.required must be true');
    assertString(team, moment.mockBadge?.copy, 'culturalMoment.mockBadge.copy');
    if (moment.reducedMotion !== 'static-only') fail(team, 'culturalMoment.reducedMotion must be static-only');
  }
}

export function assertCategoryShape(team) {
  assertMotifs(team);
  assertTypeFlourishes(team);
  assertCulturalMoments(team);
  return team;
}
