import SwiftUI

/// `ConnectFailed.dc.html` — J1's degraded pass, and the only confirmed beta failure on record.
///
/// ## Why this is a screen and not an error string
///
/// `ConnectFailure.message` already gives every failure one honest sentence, and for most of them
/// a sentence is the right size. This case is different: an ESPN session going stale is the
/// failure users actually hit, it is **not their fault**, it recurs every few weeks, and the fix
/// is a specific ordered procedure rather than "try again". A one-liner cannot carry a procedure.
///
/// The artboard's structure is the argument: what happened (with the evidence), the most likely
/// cause, what to do in order, and what is *not* broken. A user who reads this knows more than
/// they did, which is the same standard the J3 evidence rework was held to.
///
/// ## What must never appear here
///
/// **No cookie value, ever** — fact-of-record #6, and it is absolute. This screen may say the
/// cookies exist and are being refused, or that they never arrived; it never shows, logs or echoes
/// one. The league id and the HTTP status are provider facts and are safe, and they are what makes
/// the report worth sending to support.
struct OmenConnectFailedScreen: View {
    struct Diagnosis {
        let provider: String
        /// The provider's own status code. Shown because "it didn't work" is not a report anyone
        /// can act on, and support cannot triage without it.
        /// Every field is optional and the evidence line is assembled from whatever is present.
        /// **A value is never invented** — if ESPN gave no status, the sentence simply does not
        /// claim one. A fabricated 401 would be the exact false claim this screen exists to avoid.
        let statusCode: Int?
        let statusText: String?
        let leagueID: String?
        let observedAt: String?
        /// Named providers that are still live. Absent when there are none — the reassurance is
        /// only offered when it is true.
        let unaffected: [String]
    }

    let diagnosis: Diagnosis
    var onReconnect: (() -> Void)?
    var onSendToSupport: (() -> Void)?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                header
                evidence
                section("Most likely cause", likelyCause)
                steps
                actions
                if !diagnosis.unaffected.isEmpty {
                    reassurance
                }
                Color.clear.frame(height: OmenSpacing.step16)
            }
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.vertical, OmenSpacing.step12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, 64)
        }
        .background(OmenColor.bg)
        .accessibilityIdentifier("j1.connect-failed")
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
            Text(diagnosis.provider)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.accent)
            Text("That did not work")
                .omenTextStyle(OmenTypography.screenTitle)
                .foregroundStyle(OmenColor.textPrimary)
        }
    }

    /// The facts, in the provider's own terms. This is the half that makes the screen a report.
    private var evidence: some View {
        OmenCard(contentPadding: OmenSpacing.step12) {
            Text(evidenceSentence)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    /// A titled block of prose. The title is the question the paragraph answers.
    private func section(_ title: String, _ body: String) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            Text(title)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            OmenCard(contentPadding: OmenSpacing.step12) {
                Text(body)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    /// What the provider's status says about the stored values.
    ///
    /// **Three prose blocks on this screen depend on this and all three used to assume it.** The
    /// closing clause was documented as "always true" and was not: `ConnectRepository` maps a
    /// **422** to `espnSessionUnreadable` and says plainly what that status means — *"422 is the
    /// route's own 'we didn't get a session' — the values never arrived or were empty"*. The
    /// backend's error code for it is `espn_cookies_required`. So on that one branch, "the
    /// cookies are there and ESPN is refusing them" is not imprecise, it is the opposite of what
    /// happened, and the recovery it implies — reconnect, which re-reads the same values — cannot
    /// work. A user follows three ordered steps, fails identically, and concludes the app is
    /// broken. That is the outcome this screen exists to prevent.
    ///
    /// The status→meaning mapping is owned by `ConnectRepository`; this only reads it. If that
    /// mapping gains a status, it gains a case here.
    /// Non-private so `ConnectFailedSentenceTests` can pin it. The sentences this drives are
    /// factual claims about a provider failure, and one of them was wrong until 2026-09-19 — a
    /// claim that can be wrong is a claim worth a test, and a test cannot reach `private`.
    enum StoredValues: Equatable {
        /// The values reached Omen and the provider rejected them — the stale-session case, and
        /// the common one.
        case presentAndRefused
        /// The values never reached Omen, or arrived empty.
        case neverArrived
    }

    var storedValues: StoredValues {
        diagnosis.statusCode == 422 ? .neverArrived : .presentAndRefused
    }

    /// Built from the fields that are present. **A value is never invented** — the clauses are
    /// appended only for fields that exist, and the closing clause now reports what the status
    /// actually means rather than asserting one outcome for every status.
    var evidenceSentence: String {
        var parts: [String] = []
        if let code = diagnosis.statusCode {
            let text = diagnosis.statusText.map { " \($0)" } ?? ""
            parts.append("\(diagnosis.provider) returned \(code)\(text)")
        } else {
            parts.append("\(diagnosis.provider) refused the request")
        }
        if let league = diagnosis.leagueID { parts.append("for league \(league)") }
        if let at = diagnosis.observedAt { parts.append("at \(at)") }
        let closing: String
        switch storedValues {
        case .presentAndRefused:
            closing = "The cookies are there and \(diagnosis.provider) is refusing them."
        case .neverArrived:
            closing = "Omen never received the two cookies, so there was nothing to send \(diagnosis.provider)."
        }
        return parts.joined(separator: " ") + ". " + closing
    }

    /// Stated as likelihood, not as fact — Omen cannot see ESPN's session table, and asserting a
    /// cause it cannot verify is the same overclaim the capability contract prevents elsewhere.
    var likelyCause: String {
        switch storedValues {
        case .presentAndRefused:
            return "You signed out of \(diagnosis.provider) — or \(diagnosis.provider) signed you out, which it does every few weeks. The values Omen stored are stale. Nothing is wrong with your league."
        case .neverArrived:
            return "The sign-in finished without handing Omen the two cookies it needs — usually the \(diagnosis.provider) sheet was closed early, or it ended somewhere Omen could not read. Nothing is wrong with your league."
        }
    }

    /// Ordered, because the order matters — reconnecting before signing in again just re-reads
    /// the same stale values and fails identically, which is how a user concludes the app is
    /// broken. Step 2 differs by cause: re-reading is the fix when values are present and
    /// refused, and is exactly the wrong instruction when they never arrived.
    private var steps: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            Text("Try in this order")
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            OmenCard(contentPadding: OmenSpacing.step12) {
                VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                    step(1, "Open \(diagnosis.provider) Fantasy in your browser and sign in again.")
                    switch storedValues {
                    case .presentAndRefused:
                        step(2, "Come back here and tap Reconnect. Omen re-reads the two cookies.")
                    case .neverArrived:
                        step(2, "Come back here and tap Reconnect, then let the \(diagnosis.provider) sheet finish on its own — closing it early is what leaves Omen with nothing.")
                    }
                    step(3, "Still failing? The league may have been made private, or deleted.")
                }
            }
        }
    }

    private func step(_ n: Int, _ text: String) -> some View {
        HStack(alignment: .top, spacing: OmenSpacing.step12) {
            Text("\(n)")
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.accent)
                .frame(width: 16, alignment: .leading)
            Text(text)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Step \(n). \(text)")
    }

    /// Every non-success state carries a safe next action — connection contract §6. Both are
    /// offered because "reconnect" is the fix and "send this to support" is the escape when it
    /// is not, and a screen with only the first strands the user whose league really was deleted.
    private var actions: some View {
        VStack(spacing: OmenSpacing.step12) {
            if let onReconnect {
                OmenButton(
                    title: "Reconnect \(diagnosis.provider)",
                    action: onReconnect,
                    size: .lg
                )
                .frame(maxWidth: .infinity)
            }
            if let onSendToSupport {
                OmenButton(
                    title: "Send this to support",
                    action: onSendToSupport,
                    variant: .secondary,
                    size: .lg
                )
                .frame(maxWidth: .infinity)
            }
        }
    }

    /// One provider failing is not the product failing, and a user who does not know that
    /// reasonably assumes the worst.
    private var reassurance: some View {
        Text("Your other \(diagnosis.unaffected.count == 1 ? "league is" : "leagues are") unaffected. \(diagnosis.unaffected.joined(separator: " and ")) \(diagnosis.unaffected.count == 1 ? "is" : "are") still live.")
            .omenTextStyle(OmenTypography.bodySmall)
            .foregroundStyle(OmenColor.textTertiary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
