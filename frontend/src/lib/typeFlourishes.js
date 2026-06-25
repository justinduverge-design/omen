export function resolveTypeFlourishes(team, variant) {
  const source = Array.isArray(team?.typeFlourishes) ? team.typeFlourishes : [];
  const active = source.filter((flourish) => flourish.enabledInVariant.includes(variant));
  return { active };
}
