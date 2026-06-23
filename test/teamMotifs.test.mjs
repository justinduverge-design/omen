import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { NFL_TEAMS, contrastRatio } from '../frontend/src/data/nflTeams.js';
import { getTeamTemplate } from '../frontend/src/lib/teamTemplate.js';

const V1_MOTIF_TEAMS = ['PIT', 'MIA', 'NO', 'GB'];

function findTeam(abbr) {
  return NFL_TEAMS.find((team) => team.abbr === abbr);
}

test('Phase 1.5g.1 teams resolve self-assessed hairline motifs without Omen-card targets', () => {
  for (const abbr of V1_MOTIF_TEAMS) {
    const team = findTeam(abbr);
    assert.ok(team, `${abbr} exists`);
    assert.ok(Array.isArray(team.motifs), `${abbr} declares motifs array`);
    assert.ok(team.motifs.length > 0, `${abbr} ships a v1 hairline motif`);

    for (const motif of team.motifs) {
      assert.equal(motif.kind, 'hairline', `${abbr} motif is hairline-only`);
      assert.equal(motif.excludesOmenCard, true, `${abbr} excludes Omen card`);
      assert.equal(motif.reducedMotionFallback, 'identical', `${abbr} motif is static`);
      assert.equal(motif.trademarkReview, 'self-assessed', `${abbr} has self-assessed trademark review`);
      assert.ok(!motif.appliesTo.includes('omen-card'), `${abbr} never targets Omen card`);
    }

    const template = getTeamTemplate(abbr, 'official');
    assert.ok(template?.motifs?.active?.length > 0, `${abbr} official motif resolves`);
    for (const resolved of template.motifs.active) {
      assert.ok(resolved.color, `${abbr} motif resolves palette color`);
      assert.ok(
        contrastRatio(resolved.color, template.surface) >= 3,
        `${abbr} motif clears decorative contrast threshold`,
      );
    }
  }
});

test('motif layer preserves Phase 1.5h accent fallthrough pins', () => {
  assert.equal(getTeamTemplate('NYG', 'official').accent.hex, '#A71930');
  assert.equal(getTeamTemplate('HOU', 'official').accent.hex, '#A71930');
  assert.equal(getTeamTemplate('PHI', 'official').accent.hex, '#A5ACAF');
  assert.equal(getTeamTemplate('SF', 'official').accent.hex, '#B3995D');
  assert.equal(getTeamTemplate('TB', 'official').accent.hex, '#D50A0A');
  assert.equal(getTeamTemplate('ATL', 'official').accent.hex, '#A71930');
});

test('motif token writer and CSS targets are present', () => {
  const themeMode = readFileSync('frontend/src/lib/themeMode.js', 'utf8');
  assert.match(themeMode, /MOTIF_VARS/);
  assert.match(themeMode, /applyMotifTokens/);

  const css = readFileSync('frontend/src/index.css', 'utf8');
  assert.match(css, /\[data-motif-target=['"]page-edge['"]\]/);
  assert.match(css, /\[data-motif-target=['"]section-divider['"]\]/);
  assert.doesNotMatch(css, /data-motif-target=['"]omen-card['"]/);
});
