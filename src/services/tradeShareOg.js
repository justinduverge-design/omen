"use strict";

const WIDTH = 1200;
const HEIGHT = 630;

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function titleForVerdict(verdict) {
  if (verdict === "accept") return "Accept the deal";
  if (verdict === "decline") return "Decline the deal";
  return "Hold for now";
}

function signedValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return numeric > 0 ? `+${numeric}` : String(numeric);
}

function confidenceLabel(confidence) {
  const text = String(confidence || "medium").replace(/_/g, " ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} confidence`;
}

function sideLabel(players = []) {
  return players
    .slice(0, 3)
    .map((player) => player?.name || "Unknown")
    .join(", ");
}

function fitLine(text, max = 42) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
}

function buildTradeShareOgSvg(snapshot = {}) {
  const result = snapshot.result || {};
  const trade = snapshot.trade || {};
  const title = titleForVerdict(result.verdict);
  const netValue = signedValue(result.net_value);
  const confidence = confidenceLabel(result.confidence);
  const send = fitLine(sideLabel(trade.send), 48);
  const receive = fitLine(sideLabel(trade.receive), 48);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(`Omen Trade Share - ${title}`)}</title>
  <desc id="desc">${escapeXml(`Trade Analyzer public snapshot. ${title}. Net value ${netValue}.`)}</desc>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0A0A0B"/>
  <rect x="44" y="44" width="1112" height="542" rx="28" fill="#1C1C1E" stroke="#A67C2E" stroke-width="3"/>
  <rect x="76" y="76" width="1048" height="478" rx="20" fill="#0A0A0B" opacity="0.72"/>
  <text x="96" y="126" fill="#A67C2E" font-family="Alegreya Sans, Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="5">OMEN TRADE ANALYZER</text>
  <text x="96" y="218" fill="#F5F0E8" font-family="Alegreya Sans, Arial, sans-serif" font-size="74" font-weight="700">${escapeXml(title)}</text>
  <text x="96" y="292" fill="#F5F0E8" font-family="Arial, sans-serif" font-size="54" font-weight="700">${escapeXml(netValue)}</text>
  <text x="250" y="292" fill="#AEAEB2" font-family="Alegreya, Georgia, serif" font-size="31">${escapeXml(confidence)}</text>
  <line x1="96" y1="336" x2="1104" y2="336" stroke="#3A3A3C" stroke-width="2"/>
  <text x="96" y="392" fill="#AEAEB2" font-family="Alegreya Sans, Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="3">SEND</text>
  <text x="96" y="438" fill="#F5F0E8" font-family="Alegreya, Georgia, serif" font-size="34">${escapeXml(send)}</text>
  <text x="96" y="500" fill="#AEAEB2" font-family="Alegreya Sans, Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="3">RECEIVE</text>
  <text x="96" y="546" fill="#F5F0E8" font-family="Alegreya, Georgia, serif" font-size="34">${escapeXml(receive)}</text>
  <text x="884" y="548" fill="#6D6D72" font-family="Alegreya Sans, Arial, sans-serif" font-size="22">Public snapshot</text>
</svg>`;
}

module.exports = {
  buildTradeShareOgSvg,
  titleForVerdict,
};
