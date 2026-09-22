"use strict";

function roundHalf(value) {
  return Math.round(Number(value) * 2) / 2;
}

function americanMoneylineFromProbability(probability) {
  const p = Math.min(0.95, Math.max(0.05, Number(probability)));
  return p >= 0.5
    ? -Math.round((p / (1 - p)) * 100)
    : Math.round(((1 - p) / p) * 100);
}

function buildLeagueOfficeLine(matchups) {
  const candidates = (matchups || []).filter(
    (m) => Number.isFinite(Number(m.home_projected)) && Number.isFinite(Number(m.away_projected))
  );
  if (!candidates.length) return null;

  const game = [...candidates].sort((a, b) => {
    const da = Math.abs(Number(a.home_projected) - Number(a.away_projected));
    const db = Math.abs(Number(b.home_projected) - Number(b.away_projected));
    return da - db
      || (Number(b.home_projected) + Number(b.away_projected))
        - (Number(a.home_projected) + Number(a.away_projected));
  })[0];

  const home = Number(game.home_projected);
  const away = Number(game.away_projected);
  const favoriteTeamId = home >= away ? game.home_team_id : game.away_team_id;
  const margin = Math.abs(home - away);
  const favoriteProbability = 1 / (1 + Math.exp(-margin / 12));

  return {
    game_id: String(game.game_id),
    favorite_team_id: String(favoriteTeamId),
    spread: -Math.max(0.5, roundHalf(margin)),
    favorite_moneyline: americanMoneylineFromProbability(favoriteProbability),
    underdog_moneyline: americanMoneylineFromProbability(1 - favoriteProbability),
    over_under: roundHalf(home + away),
    selection_reason: "Closest projected matchup; League Office line derived from ESPN fantasy projections.",
  };
}

function firstFinite(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    if (Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function playerName(player, id) {
  return player?.fullName
    || player?.full_name
    || player?.name
    || `${player?.firstName || ""} ${player?.lastName || ""}`.trim()
    || id
    || "Unknown";
}

function leagueOfficeTransactionsFromEspnData(data) {
  const txs = Array.isArray(data?.transactions) ? data.transactions : [];
  return txs.flatMap((tx) => {
    const status = String(tx?.status || tx?.executionType || "").toUpperCase();
    if (status && !["EXECUTED", "PROCESSED"].includes(status)) return [];
    const processDate = tx?.processDate ?? tx?.proposedDate ?? tx?.date ?? null;
    const items = Array.isArray(tx?.items) ? tx.items : [];
    return items.flatMap((item) => {
      const player = item?.playerPoolEntry?.player || item?.player || {};
      const playerIdValue = item?.playerId ?? item?.playerPoolEntry?.id ?? player?.id;
      if (playerIdValue == null) return [];
      const type = String(item?.type || item?.transactionType || item?.action || "").toUpperCase();
      const fromTeamId = item?.fromTeamId ?? item?.fromTeam?.id ?? null;
      const toTeamId = item?.toTeamId ?? item?.toTeam?.id ?? null;
      let action = null;
      if (type.includes("ADD") || (Number(toTeamId) > 0 && Number(fromTeamId || 0) === 0)) action = "ADD";
      if (type.includes("DROP") || (Number(fromTeamId) > 0 && Number(toTeamId || 0) === 0)) action = "DROP";
      if (!action) return [];
      return [{
        action,
        player_id: String(playerIdValue),
        player_name: playerName(player, String(playerIdValue)),
        team_id: String(action === "ADD" ? toTeamId : fromTeamId),
        process_date: processDate == null ? null : Number(processDate),
        bid_amount: firstFinite(item?.bidAmount, tx?.bidAmount),
      }];
    });
  });
}

module.exports = {
  americanMoneylineFromProbability,
  buildLeagueOfficeLine,
  leagueOfficeTransactionsFromEspnData,
};
