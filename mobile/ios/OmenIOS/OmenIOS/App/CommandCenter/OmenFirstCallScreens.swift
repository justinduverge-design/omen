import Foundation
import SwiftUI

/// J3, screen two: the expanded argument behind one Omen call.
///
/// The canvas owns this composition; the receipt owns the words. Capability inputs are rendered
/// as a key, a server sentence, and a status word. There are deliberately no capability glyphs:
/// `capability-symbols-v1.md` corrected that invented requirement on 2026-09-18.
struct OmenEvidenceScreen: View {
    let payload: OmenDecisionBriefPayload
    var weekLabel: String?
    var onOpenAccount: (() -> Void)?
    /// Absent when the caller does not know the context. The bar is then not drawn at all,
    /// rather than drawn empty — an unlabelled switcher is worse than none.
    var context: OmenFirstCallContext?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                header
                scope

                VStack(alignment: .leading, spacing: OmenSpacing.step10) {
                    ForEach(Array(payload.signals.enumerated()), id: \.offset) { _, signal in
                        OmenCapabilityEvidenceRow(signal: signal)
                    }
                }
                .padding(.top, OmenSpacing.step4)

                if !payload.alternatives.isEmpty {
                    sectionHeader("What else was considered")
                    OmenCard(contentPadding: OmenSpacing.step12) {
                        VStack(alignment: .leading, spacing: OmenSpacing.step10) {
                            ForEach(payload.alternatives) { alternative in
                                OmenPlayerRow(
                                    name: alternative.name,
                                    position: alternative.position,
                                    team: alternative.team,
                                    meta: alternative.meta
                                )
                            }
                        }
                    }
                }

                sectionHeader("Confidence", trailing: payload.confidenceBand?.label)
                confidenceCard
                Color.clear.frame(height: OmenSpacing.step16)
            }
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.vertical, OmenSpacing.step12)
            .frame(maxWidth: .infinity, alignment: .leading)
                // The iOS 26 floating tab bar overlays content rather than insetting it, and
                // the 46.5pt switcher bar pushed this screen's last line under it — measured at
                // 98% occluded, tab-bar top 769.0pt against a line spanning 768.3-799.7pt.
                // This clearance makes the line reachable by scrolling instead of hidden with no
                // affordance. It does NOT restore D11: the screen no longer fits, and which of
                // spacing, the ledger line or the fit itself gives way is a founder call.
                .padding(.bottom, 64)
        }
        // `safeAreaInset` rather than a VStack wrapper: wrapping made the ScrollView a child
        // and it lost its own bottom inset, so the last line slid under the tab bar. Applied
        // before `.background` so it insets the scroll view rather than the wrapper.
        .safeAreaInset(edge: .top, spacing: 0) {
            if let context { context.bar }
        }
        .background(OmenColor.bg)
        .accessibilityIdentifier("j3.omen-evidence")
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                if let weekLabel {
                    Text(weekLabel)
                        .omenTextStyle(OmenTypography.micro)
                        .foregroundStyle(OmenColor.accent)
                }
                Text("The argument")
                    .omenTextStyle(OmenTypography.screenTitle)
                    .foregroundStyle(OmenColor.textPrimary)
            }
            Spacer(minLength: OmenSpacing.step8)
            OmenScreenHeaderControls(
                topic: OmenContextualHelpContent.topic(for: .omen),
                onOpenAccount: onOpenAccount
            )
        }
    }

    private var scope: some View {
        HStack(alignment: .firstTextBaseline, spacing: OmenSpacing.step8) {
            Text(payload.verdict)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            Spacer(minLength: OmenSpacing.step8)
            if let impact = payload.impact {
                Text(impact)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
                    .multilineTextAlignment(.trailing)
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var confidenceCard: some View {
        OmenCard(contentPadding: OmenSpacing.step12) {
            VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                HStack(spacing: OmenSpacing.step14) {
                    if let band = payload.confidenceBand {
                        OmenConfidenceBandLabel(band: band)
                    } else {
                        Text("No confidence read")
                            .omenTextStyle(OmenTypography.micro)
                            .foregroundStyle(OmenColor.textTertiary)
                    }
                    OmenRiskLabel(level: payload.risk, reason: payload.riskReasons.first)
                }
                ForEach(payload.confidenceDrivers, id: \.self) { driver in
                    Text(driver)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                }
                ForEach(payload.confidenceUnavailableReason, id: \.self) { reason in
                    Text(reason)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                }
            }
        }
    }

    private func sectionHeader(_ title: String, trailing: String? = nil) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            Spacer(minLength: OmenSpacing.step8)
            if let trailing {
                Text(trailing)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
            }
        }
        .padding(.top, OmenSpacing.step4)
    }
}

/// One capability row in the canvas's word-first evidence vocabulary.
private struct OmenCapabilityEvidenceRow: View {
    let signal: OmenSignalItem

    private var readButUnused: Bool { signal.source == .live && signal.used == false }

    var body: some View {
        HStack(alignment: .top, spacing: OmenSpacing.step10) {
            Text(signal.label)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
                // A capability key is a server-owned name, not copy we control, and the longest
                // single word in the vocabulary ("PROJECTIONS") broke mid-word at this width —
                // "PROJECTION / S". Scaling the key down is the honest trade: the name stays
                // whole and legible, and the sentence beside it keeps its full column.
                // `fixedSize` forced the ideal vertical size, which made SwiftUI wrap before it
                // would ever scale — so `minimumScaleFactor` alone did nothing here. Capping the
                // key at two lines lets the scale factor act on the one-word names.
                .lineLimit(2)
                .minimumScaleFactor(0.7)
                .frame(width: 84, alignment: .leading)
                .padding(.top, OmenSpacing.step4)

            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                if let detail = signal.detail, !detail.isEmpty {
                    Text(detail)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(readButUnused ? OmenColor.textTertiary : OmenColor.textSecondary)
                }
                status
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(signal.label). \(signal.detail ?? "No detail"). \(statusWord).")
    }

    @ViewBuilder private var status: some View {
        if readButUnused {
            Text("Not used")
                .omenTextStyle(OmenTypography.micro)
                .italic()
                .foregroundStyle(OmenColor.textTertiary)
        } else {
            switch signal.source {
            case .live: OmenBadge(label: "Live", tone: .live)
            case .stub: OmenBadge(label: "Provisional", tone: .stub)
            case .mock: OmenBadge(label: "Sample", tone: .mock)
            case .unavailable: OmenBadge(label: "Unavailable", tone: .unavailable)
            }
        }
    }

    private var statusWord: String {
        if readButUnused { return "Read, not used" }
        switch signal.source {
        case .live: return "Live"
        case .stub: return "Provisional"
        case .mock: return "Sample"
        case .unavailable: return "Unavailable"
        }
    }
}

/// J3, screen three/four. One destination renders the route's honest state: the clear-decision
/// composition when the response names a comparison, and the incomplete-data composition when a
/// required capability could not be read.
struct OmenStartSitScreen: View {
    let detail: StartSitDetail
    var onRetry: (() -> Void)?
    var onOpenAccount: (() -> Void)?
    var context: OmenFirstCallContext?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                header
                switch detail.state {
                case "clear_decision", "close_decision", "player_unavailable":
                    clearDecision
                case "incomplete_data":
                    incompleteDecision
                case "off_season":
                    OmenStateSurface(
                        kind: .empty,
                        title: "Lineup decisions return in season",
                        message: detail.message ?? "Omen will read your lineup again when the regular season begins."
                    )
                default:
                    OmenStateSurface(
                        kind: .empty,
                        title: "No lineup change",
                        message: detail.message ?? "Omen did not find a defensible lineup change for this slot."
                    )
                }
                Color.clear.frame(height: OmenSpacing.step16)
            }
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.vertical, OmenSpacing.step12)
            .frame(maxWidth: .infinity, alignment: .leading)
                // The iOS 26 floating tab bar overlays content rather than insetting it, and
                // the 46.5pt switcher bar pushed this screen's last line under it — measured at
                // 98% occluded, tab-bar top 769.0pt against a line spanning 768.3-799.7pt.
                // This clearance makes the line reachable by scrolling instead of hidden with no
                // affordance. It does NOT restore D11: the screen no longer fits, and which of
                // spacing, the ledger line or the fit itself gives way is a founder call.
                .padding(.bottom, 64)
        }
        // `safeAreaInset` rather than a VStack wrapper: wrapping made the ScrollView a child
        // and it lost its own bottom inset, so the last line slid under the tab bar. Applied
        // before `.background` so it insets the scroll view rather than the wrapper.
        .safeAreaInset(edge: .top, spacing: 0) {
            if let context { context.bar }
        }
        .background(OmenColor.bg)
        .accessibilityIdentifier("j3.start-sit.\(detail.state)")
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                if let week = detail.week {
                    Text("Week \(week) · Start / sit")
                        .omenTextStyle(OmenTypography.micro)
                        .foregroundStyle(OmenColor.accent)
                } else {
                    Text("Start / sit")
                        .omenTextStyle(OmenTypography.micro)
                        .foregroundStyle(OmenColor.accent)
                }
                // The v2 route returns one recommendation pair, not a complete roster. The canvas's
                // "Your lineup" is therefore a shape cue, not a literal the product may claim.
                Text(detail.state == "incomplete_data" ? "Partial read" : "The call")
                    .omenTextStyle(OmenTypography.screenTitle)
                    .foregroundStyle(OmenColor.textPrimary)
            }
            Spacer(minLength: OmenSpacing.step8)
            OmenScreenHeaderControls(
                topic: OmenContextualHelpContent.topic(for: .omen),
                onOpenAccount: onOpenAccount
            )
        }
    }

    @ViewBuilder private var clearDecision: some View {
        if let recommendation = detail.recommendation,
           let start = recommendation.start,
           let over = recommendation.over {
            OmenCard(contentPadding: OmenSpacing.step12) {
                Text(clearSummary(recommendation: recommendation, start: start, over: over))
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
            }

            sectionHeader("The clear call", trailing: recommendation.slot)
            OmenCard(contentPadding: OmenSpacing.step12) {
                VStack(spacing: 0) {
                    startSitPlayerRow(start, role: "Start")
                    Divider().overlay(OmenColor.borderSubtle)
                    startSitPlayerRow(over, role: "Sit")
                }
            }

            sectionHeader(
                detail.state == "close_decision" ? "Why it stays close" : "Why it is clear",
                trailing: recommendation.pointsDelta.map { String(format: "+%.1f points", $0) }
            )
            OmenCard(contentPadding: OmenSpacing.step12) {
                HStack(alignment: .top, spacing: OmenSpacing.step10) {
                    StartSitSwapMark()
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        ForEach(detail.why, id: \.self) { reason in
                            Text(reason)
                                .omenTextStyle(OmenTypography.bodySmall)
                                .foregroundStyle(OmenColor.textSecondary)
                        }
                        ForEach(detail.evidence, id: \.statement) { item in
                            if let statement = item.statement {
                                Text(evidenceLine(item, statement: statement))
                                    .omenTextStyle(OmenTypography.bodySmall)
                                    .foregroundStyle(OmenColor.textSecondary)
                            }
                        }
                        HStack(spacing: OmenSpacing.step14) {
                            if let confidence = recommendation.confidence {
                                Text(confidence.replacingOccurrences(of: "_", with: " "))
                                    .omenTextStyle(OmenTypography.micro)
                                    .foregroundStyle(OmenColor.accentHover)
                            }
                            if detail.state == "player_unavailable" {
                                OmenRiskLabel(level: .high, reason: over.status.map { "\($0) — unavailable" })
                            } else {
                                OmenRiskLabel(level: detail.state == "close_decision" ? .medium : .low)
                            }
                        }
                    }
                }
            }

            if !detail.whatCouldChangeThis.isEmpty {
                sectionHeader("What could change this")
                OmenCard(contentPadding: OmenSpacing.step12) {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        ForEach(detail.whatCouldChangeThis, id: \.self) { condition in
                            Text(condition)
                                .omenTextStyle(OmenTypography.bodySmall)
                                .foregroundStyle(OmenColor.textSecondary)
                        }
                    }
                }
            }
        } else {
            OmenStateSurface(
                kind: .error,
                title: "The lineup call was incomplete",
                message: "Omen received a decision state without both players. Refresh before acting."
            )
        }
    }

    @ViewBuilder private var incompleteDecision: some View {
        OmenCard(variant: .empty, contentPadding: OmenSpacing.step10) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text("Omen is working from part of the decision context.")
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                Text(detail.message ?? "A required lineup input was unavailable, so Omen did not make a call.")
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textTertiary)
            }
        }

        let visible = detail.capabilities.filter { $0.state != "not_requested" }
        let readable = visible.filter { $0.state == "live" }
        let unavailable = visible.filter { $0.state != "live" }

        if !readable.isEmpty {
            sectionHeader("What Omen could read", trailing: "\(readable.count) input\(readable.count == 1 ? "" : "s")")
            capabilityCard(readable)
        }
        if !unavailable.isEmpty {
            sectionHeader("What it could not", trailing: "\(unavailable.count) input\(unavailable.count == 1 ? "" : "s")")
            capabilityCard(unavailable)
        }

        sectionHeader("So Omen is not making a call")
        OmenCard(contentPadding: OmenSpacing.step12) {
            Text("A recommendation without the required lineup inputs would look like advice and be a guess. Restore the missing read, or make this week’s call yourself.")
                .omenTextStyle(OmenTypography.name)
                .foregroundStyle(OmenColor.textSecondary)
        }
        if let onRetry {
            OmenButton(
                title: retryTitle,
                action: onRetry,
                variant: .primary,
                size: .lg
            )
        }
    }

    private func capabilityCard(_ capabilities: [OmenDecisionCapability]) -> some View {
        OmenCard(contentPadding: OmenSpacing.step12) {
            VStack(alignment: .leading, spacing: OmenSpacing.step10) {
                ForEach(Array(capabilities.enumerated()), id: \.offset) { _, capability in
                    OmenCapabilityEvidenceRow(signal: capability.signalItem)
                }
            }
        }
    }

    private func startSitPlayerRow(_ player: StartSitDetail.Player, role: String) -> some View {
        HStack(alignment: .center, spacing: OmenSpacing.step10) {
            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                Text(player.name ?? "Unnamed player")
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textPrimary)
                Text([role, player.position, player.team, player.status].compactMap { $0 }.joined(separator: " · "))
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
            }
            Spacer(minLength: OmenSpacing.step8)
            if let projection = player.projectedPoints {
                Text(String(format: "%.1f", projection))
                    .omenTextStyle(OmenTypography.numeric)
                    .foregroundStyle(role == "Start" ? OmenColor.textPrimary : OmenColor.textTertiary)
            }
        }
        .padding(.vertical, OmenSpacing.step8)
        .accessibilityElement(children: .combine)
    }

    private func sectionHeader(_ title: String, trailing: String? = nil) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            Spacer(minLength: OmenSpacing.step8)
            if let trailing {
                Text(trailing)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
            }
        }
        .padding(.top, OmenSpacing.step4)
    }

    private func clearSummary(
        recommendation: StartSitDetail.Recommendation,
        start: StartSitDetail.Player,
        over: StartSitDetail.Player
    ) -> String {
        let verb = detail.state == "close_decision" ? "leans toward" : "favors"
        let names = "Omen \(verb) \(start.name ?? "the available option") over \(over.name ?? "the current starter")"
        guard let delta = recommendation.pointsDelta else { return names + "." }
        return names + String(format: " by %.1f projected points.", delta)
    }

    private func evidenceLine(_ item: StartSitDetail.Evidence, statement: String) -> String {
        guard let kind = item.kind, !kind.isEmpty else { return statement }
        let label = kind.replacingOccurrences(of: "_", with: " ").capitalized
        return "\(label) · \(statement)"
    }

    private var retryTitle: String {
        guard let platform = detail.platform, !platform.isEmpty else { return "Retry the connection" }
        return "Retry \(platform.capitalized)"
    }
}

private struct StartSitSwapMark: View {
    var body: some View {
        VStack(spacing: 0) {
            Circle().fill(OmenColor.accent).frame(width: OmenSpacing.step8, height: OmenSpacing.step8)
            Rectangle().fill(OmenColor.borderSubtle).frame(width: OmenSpacing.step2).frame(maxHeight: .infinity)
            Circle().fill(OmenColor.surface3).frame(width: OmenSpacing.step6, height: OmenSpacing.step6)
        }
        .frame(width: OmenSpacing.step20)
        .frame(minHeight: OmenSpacing.step64)
        .accessibilityHidden(true)
    }
}

private extension OmenDecisionCapability {
    var signalItem: OmenSignalItem {
        OmenSignalItem(
            label: (name ?? "Unknown input")
                .split(separator: "_")
                .map { $0.prefix(1).uppercased() + $0.dropFirst().lowercased() }
                .joined(separator: " "),
            source: signalSource,
            detail: statement ?? source,
            kind: kind.flatMap(OmenEvidenceKind.init(rawValue:)),
            used: used
        )
    }

    private var signalSource: OmenSignalSource {
        switch state {
        case "live": return .live
        case "stub": return .stub
        case "mock", "demo": return .mock
        default: return .unavailable
        }
    }
}

// The E017 header controls and the switcher-bar context that used to live here are now in
// `DesignSystem/OmenScreenShell.swift`. They were never J3-specific: J2's five Command Center
// screens carry both, and J4/J5/J6 will too. `OmenFirstCallContext` survives there as a
// typealias for `OmenScreenContext`, so nothing below changed.
