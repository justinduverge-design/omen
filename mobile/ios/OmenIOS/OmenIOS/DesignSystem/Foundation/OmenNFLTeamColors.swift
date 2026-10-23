import SwiftUI

/// NFL team colours for the player badge (`omen-design-foundation-v1.md` § 5, Player badge).
///
/// Each team has a fill and the text colour drawn on it. The fill is the team's primary (or, where the
/// primary cannot carry legible text, the team's darker secondary); the text colour is chosen so the
/// pair clears 4.5:1, which `NFLTeamColorContrastTests` checks for every team. These are the same in
/// dark and light mode: a jersey is a jersey.
enum OmenNFLTeamColors {
    struct Pair: Equatable {
        let fill: UInt32
        let text: UInt32
    }

    static let pairs: [String: Pair] = [
        "ARI": Pair(fill: 0x97233F, text: 0xFFFFFF),
        "ATL": Pair(fill: 0xA71930, text: 0xFFFFFF),
        "BAL": Pair(fill: 0x241773, text: 0xFFFFFF),
        "BUF": Pair(fill: 0x00338D, text: 0xFFFFFF),
        "CAR": Pair(fill: 0x0085CA, text: 0x000000),
        "CHI": Pair(fill: 0x0B162A, text: 0xFFFFFF),
        "CIN": Pair(fill: 0xFB4F14, text: 0x000000),
        "CLE": Pair(fill: 0x311D00, text: 0xFFFFFF),
        "DAL": Pair(fill: 0x041E42, text: 0xFFFFFF),
        "DEN": Pair(fill: 0xFB4F14, text: 0x002244),
        "DET": Pair(fill: 0x0076B6, text: 0xFFFFFF),
        "GB": Pair(fill: 0x203731, text: 0xFFB612),
        "HOU": Pair(fill: 0x03202F, text: 0xFFFFFF),
        "IND": Pair(fill: 0x002C5F, text: 0xFFFFFF),
        "JAX": Pair(fill: 0x006778, text: 0xFFFFFF),
        "KC": Pair(fill: 0xC8102E, text: 0xFFFFFF),
        "LV": Pair(fill: 0xA5ACAF, text: 0x000000),
        "LAC": Pair(fill: 0x002A5E, text: 0xFFC20E),
        "LAR": Pair(fill: 0x003594, text: 0xFFD100),
        "MIA": Pair(fill: 0x008E97, text: 0x000000),
        "MIN": Pair(fill: 0x4F2683, text: 0xFFC62F),
        "NE": Pair(fill: 0x002244, text: 0xFFFFFF),
        "NO": Pair(fill: 0xD3BC8D, text: 0x101820),
        "NYG": Pair(fill: 0x0B2265, text: 0xFFFFFF),
        "NYJ": Pair(fill: 0x125740, text: 0xFFFFFF),
        "PHI": Pair(fill: 0x004C54, text: 0xFFFFFF),
        "PIT": Pair(fill: 0x101820, text: 0xFFB612),
        "SF": Pair(fill: 0xAA0000, text: 0xFFFFFF),
        "SEA": Pair(fill: 0x002244, text: 0x69BE28),
        "TB": Pair(fill: 0xD50A0A, text: 0xFFFFFF),
        "TEN": Pair(fill: 0x0C2340, text: 0x4B92DB),
        "WAS": Pair(fill: 0x5A1414, text: 0xFFB612),
    ]

    /// Provider abbreviations that differ from the table's keys.
    private static let aliases: [String: String] = [
        "ARZ": "ARI", "JAC": "JAX", "LA": "LAR", "LVR": "LV", "OAK": "LV", "SD": "LAC", "STL": "LAR",
        "WSH": "WAS", "GNB": "GB", "KAN": "KC", "NOR": "NO", "NWE": "NE", "SFO": "SF", "TAM": "TB",
    ]

    /// The pair for a team abbreviation, or nil for a free agent, a defence without a team, or an unknown code.
    static func pair(for team: String?) -> Pair? {
        guard let raw = team?.uppercased(), !raw.isEmpty else { return nil }
        return pairs[aliases[raw] ?? raw]
    }

    static func color(_ hex: UInt32) -> Color {
        Color(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }

    /// WCAG relative-luminance contrast ratio between two colours.
    static func contrast(_ a: UInt32, _ b: UInt32) -> Double {
        func luminance(_ hex: UInt32) -> Double {
            func channel(_ v: UInt32) -> Double {
                let c = Double(v) / 255
                return c <= 0.03928 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)
            }
            return 0.2126 * channel((hex >> 16) & 0xFF) + 0.7152 * channel((hex >> 8) & 0xFF) + 0.0722 * channel(hex & 0xFF)
        }
        let (l1, l2) = (luminance(a), luminance(b))
        return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)
    }
}
