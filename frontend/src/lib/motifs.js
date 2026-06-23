const PRODUCTION_RENDER =
  typeof import.meta !== 'undefined' && import.meta.env?.PROD === true;

function productionAllowed(motif) {
  return motif.trademarkReview === 'self-assessed' || motif.trademarkReview === 'counsel-approved';
}

export function resolveMotifs(team, palette, surfaceIsDark, options = {}) {
  const production = options.production ?? PRODUCTION_RENDER;
  const source = Array.isArray(team?.motifs) ? team.motifs : [];
  const active = [];

  for (const motif of source) {
    if (production && !productionAllowed(motif)) continue;

    const roleColor = palette?.byRole?.[motif.colorRole];
    if (!roleColor?.hex) continue;

    active.push({
      ...motif,
      color: roleColor.hex,
      colorName: roleColor.name,
      opacityValue: surfaceIsDark ? motif.opacity.dark : motif.opacity.light,
    });
  }

  return { active };
}
