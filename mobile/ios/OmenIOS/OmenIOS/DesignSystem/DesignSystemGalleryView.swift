#if DEBUG
import SwiftUI

/// Debug-only (`#if DEBUG`) evidence surface for M1-P P4. The SwiftUI counterpart to the
/// Android `DesignSystemGalleryActivity`. Not a product screen and never routed from
/// release code — this exists solely so a session can screenshot every registry §3.1
/// primitive in one place on an iPhone simulator or device.
///
/// Any addition here must render an approved primitive from `DesignSystem/`; do not
/// introduce raw SwiftUI `Button`, `Color(...)`, `TextField`, or `Alert` calls in this
/// file. The enforcement test walks this file too.
struct DesignSystemGalleryView: View {
    @State private var email: String = ""
    @State private var invite: String = "OMEN-2026"
    @State private var league: String = "Sunday Slate"
    @State private var locked: String = "Already connected"
    @State private var format: String = "Standard"
    @State private var showDefaultConfirm = false
    @State private var showDestructiveConfirm = false
    @FocusState private var buttonFocus: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.step24) {
                section("Focus ring (auto-focused on launch — no touch involved)") {
                    OmenButton(title: "Focused", action: {})
                        .focused($buttonFocus)
                        .onAppear { buttonFocus = true }
                }

                section("IconButton — tone × state") {
                    HStack(spacing: OmenSpacing.step12) {
                        OmenIconButton(contentDescription: "Close", icon: placeholderIcon, action: {}, tone: .neutral)
                        OmenIconButton(contentDescription: "Favorite", icon: placeholderIcon, action: {}, tone: .accent)
                        OmenIconButton(contentDescription: "Delete", icon: placeholderIcon, action: {}, tone: .danger)
                        OmenIconButton(contentDescription: "Disabled", icon: placeholderIcon, action: {}, enabled: false)
                        OmenIconButton(contentDescription: "Loading", icon: placeholderIcon, action: {}, loading: true)
                    }
                }

                section("Button — disabled") {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        OmenButton(title: "Primary disabled", action: {}, enabled: false)
                        OmenButton(title: "Secondary disabled", action: {}, variant: .secondary, enabled: false)
                        OmenButton(title: "Danger disabled", action: {}, variant: .danger, enabled: false)
                    }
                }

                section("Button — loading") {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        OmenButton(title: "Save", action: {}, loading: true)
                        OmenButton(title: "Delete", action: {}, variant: .danger, loading: true)
                    }
                }

                section("Button — variant × tone (default)") {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        OmenButton(title: "Primary / Accent", action: {}, variant: .primary, tone: .accent)
                        OmenButton(title: "Primary / Omen", action: {}, variant: .primary, tone: .omen)
                        OmenButton(title: "Secondary / Accent", action: {}, variant: .secondary, tone: .accent)
                        OmenButton(title: "Secondary / Omen", action: {}, variant: .secondary, tone: .omen)
                        OmenButton(title: "Tertiary / Accent", action: {}, variant: .tertiary, tone: .accent)
                        OmenButton(title: "Danger", action: {}, variant: .danger)
                        OmenButton(title: "Link", action: {}, variant: .link)
                    }
                }

                section("Button — sizes") {
                    HStack(spacing: OmenSpacing.step8) {
                        OmenButton(title: "Sm", action: {}, size: .sm)
                        OmenButton(title: "Md", action: {}, size: .md)
                        OmenButton(title: "Lg", action: {}, size: .lg)
                    }
                }

                section("Card / Surface — solid, outlined, empty, error, preview") {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        OmenCard {
                            Text("Solid / neutral")
                                .omenTextStyle(OmenTypography.h2)
                                .foregroundStyle(OmenColor.textPrimary)
                        }
                        OmenCard(variant: .outlined, tone: .omen) {
                            Text("Outlined / Omen")
                                .omenTextStyle(OmenTypography.h2)
                                .foregroundStyle(OmenColor.textPrimary)
                        }
                        OmenCard(variant: .empty) {
                            Text("Empty surface")
                                .omenTextStyle(OmenTypography.body)
                                .foregroundStyle(OmenColor.textSecondary)
                        }
                        OmenCard(variant: .error) {
                            Text("Unable to refresh this matchup")
                                .omenTextStyle(OmenTypography.body)
                                .foregroundStyle(OmenColor.textPrimary)
                        }
                        OmenCard(variant: .preview, tone: .risk) {
                            Text("Preview / risk")
                                .omenTextStyle(OmenTypography.body)
                                .foregroundStyle(OmenColor.textPrimary)
                        }
                    }
                }

                section("Badge + Chip — semantic labels and selected state") {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        HStack(spacing: OmenSpacing.step8) {
                            OmenBadge(label: "Live", tone: .live)
                            OmenBadge(label: "Mock", tone: .mock)
                            OmenBadge(label: "Risk", tone: .risk)
                        }
                        HStack(spacing: OmenSpacing.step8) {
                            OmenChip(label: "RB", tone: .rb)
                            OmenChip(label: "Sleeper", tone: .sleeper, selected: true, action: {})
                            OmenChip(label: "Demo", tone: .demo, enabled: false, action: {})
                        }
                    }
                }

                section("Form controls — default, error, success, disabled") {
                    VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                        OmenFormField(label: "Email", hint: "We use this only to send your sign-in code.") {
                            OmenTextField(value: $email, label: "Email", placeholder: "you@example.com", variant: .email)
                        }
                        OmenFormField(label: "Invite code", errorMessage: "That code is not valid yet.") {
                            OmenTextField(value: $invite, label: "Invite code", isError: true)
                        }
                        OmenFormField(label: "League name", successMessage: "League name is available.") {
                            OmenTextField(value: $league, label: "League name")
                        }
                        OmenFormField(label: "Scoring format", hint: "You can change this later.") {
                            OmenPicker(label: "Scoring format", selectedOption: $format, options: ["Standard", "Half PPR", "PPR"])
                        }
                        OmenFormField(label: "Locked field") {
                            OmenTextField(value: $locked, label: "Connection status", enabled: false)
                        }
                    }
                }

                section("State surfaces — honest empty/loading/error/connection/data states") {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        OmenStateSurface(kind: .empty, title: "No lineup selected", message: "Choose a league to see your matchup.")
                        OmenStateSurface(kind: .loading, title: "Analyzing your matchup…", message: "Checking the latest roster and schedule signals.")
                        OmenStateSurface(kind: .error, title: "Unable to refresh this matchup", message: "Try again when your connection is available.")
                        OmenStateSurface(kind: .disconnected, title: "League disconnected", message: "Reconnect Sleeper to restore live context.")
                        OmenStateSurface(kind: .stale, title: "Showing your last sync", message: "This league data may be out of date.")
                        OmenStateSurface(kind: .mock, title: "Demo analysis", message: "These values are sample data, not live advice.")
                    }
                }

                section("ListRow — display and interactive") {
                    VStack(spacing: 0) {
                        OmenListRow(title: "Weekly Omen", subtitle: "Your matchup recommendation")
                        OmenListRow(title: "Sunday Slate", subtitle: "Sleeper · 12 teams", action: {})
                    }
                }

                section("PlatformBadge — Sleeper / Yahoo / ESPN") {
                    HStack(spacing: OmenSpacing.step8) {
                        OmenPlatformBadge(platform: .sleeper)
                        OmenPlatformBadge(platform: .yahoo)
                        OmenPlatformBadge(platform: .espn)
                    }
                }

                section("ModalSheet — token-backed content container") {
                    OmenModalSheet(title: "Modal example") {
                        Text("Sheet content uses shared tokens.")
                            .omenTextStyle(OmenTypography.body)
                            .foregroundStyle(OmenColor.textSecondary)
                    }
                }

                section("ConfidenceBar — labeled and unlabeled") {
                    VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                        OmenConfidenceBar(score: 72, label: "Confidence")
                        OmenConfidenceBar(score: 15, label: "Confidence")
                        OmenConfidenceBar(score: 100)
                    }
                }

                section("RiskPanel — low / medium / high") {
                    VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                        OmenRiskPanel(level: .low, reasons: ["Bench depth is strong.", "Weather stable."])
                        OmenRiskPanel(level: .medium, reasons: ["Backup RB questionable.", "Weather uncertain."])
                        OmenRiskPanel(level: .high, reasons: ["Starter ruled out.", "Kicker on the road in wind."])
                    }
                }

                section("MetricStrip — value + delta + optional confidence") {
                    OmenMetricStrip(items: [
                        OmenMetricItem(label: "Projected", value: "142.6", delta: "+4.1", deltaDirection: .positive, confidence: 72),
                        OmenMetricItem(label: "Opponent", value: "128.4", delta: "−2.3", deltaDirection: .negative),
                        OmenMetricItem(label: "Ceiling", value: "168.2"),
                    ])
                }

                section("SignalList — live / stub / mock / unavailable") {
                    OmenSignalList(signals: [
                        OmenSignalItem(label: "Yahoo roster snapshot", source: .live, detail: "Refreshed 4 minutes ago."),
                        OmenSignalItem(label: "Opponent projections", source: .stub, detail: "Backfilled from last week."),
                        OmenSignalItem(label: "Weather forecast", source: .mock, detail: "Demo fixture."),
                        OmenSignalItem(label: "Vegas totals", source: .unavailable, detail: "Provider silent this window."),
                    ])
                }

                section("PlayerRow + PlayerChip") {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        OmenPlayerRow(name: "Christian McCaffrey", position: .rb, team: "SF", meta: "Q vs Dal, 4:25p ET")
                        OmenPlayerRow(name: "Justin Jefferson", position: .wr, team: "MIN", meta: "vs GB, 1:00p ET", action: {})
                        OmenPlayerRow(name: "Patrick Mahomes", position: .qb, team: "KC")
                        HStack(spacing: OmenSpacing.step8) {
                            OmenPlayerChip(name: "Kelce", position: .te)
                            OmenPlayerChip(name: "49ers D/ST", position: .def)
                        }
                    }
                }

                section("ConnectionStatusBadge — all six states") {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        OmenConnectionStatusBadge(status: .connected)
                        OmenConnectionStatusBadge(status: .disconnected)
                        OmenConnectionStatusBadge(status: .needsReauth)
                        OmenConnectionStatusBadge(status: .error)
                        OmenConnectionStatusBadge(status: .pending)
                        OmenConnectionStatusBadge(status: .recovering)
                    }
                }

                section("PlatformConnectionCard — connected / reauth / disconnected") {
                    VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                        OmenPlatformConnectionCard(
                            platform: .sleeper, status: .connected,
                            description: "Last synced 4 minutes ago.",
                            actionLabel: "Manage league", onAction: {}
                        )
                        OmenPlatformConnectionCard(
                            platform: .yahoo, status: .needsReauth,
                            description: "Reconnect to restore this week's roster.",
                            actionLabel: "Reconnect Yahoo", onAction: {}
                        )
                        OmenPlatformConnectionCard(
                            platform: .espn, status: .disconnected,
                            description: "Connect ESPN to see your live matchup.",
                            actionLabel: "Connect ESPN", onAction: {}
                        )
                    }
                }

                section("Command Center — screen assembly (feature layer) · connected / disconnected / reauth") {
                    VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                        OmenCommandCenterScreen(state: OmenCommandCenterFixtures.demoConnected)
                            .frame(maxHeight: 900)
                        OmenCommandCenterScreen(state: OmenCommandCenterFixtures.demoDisconnected)
                            .frame(maxHeight: 700)
                        OmenCommandCenterScreen(state: OmenCommandCenterFixtures.demoReauth)
                            .frame(maxHeight: 700)
                    }
                }

                section("DecisionBrief — success / stale / mock / empty / loading / error / disconnected / off-season") {
                    let payload = OmenDecisionBriefPayload(
                        verdict: "Start Christian McCaffrey",
                        move: "Bench Ken Walker for the RB1 slot.",
                        impact: "+4.1 projected over your bench.",
                        confidence: 72,
                        risk: .low,
                        riskReasons: ["McCaffrey full-practice Fri.", "Weather stable in SF."],
                        explanation: ["49ers implied 27 against a bottom-5 rush defense."],
                        metrics: [
                            OmenMetricItem(label: "Projected", value: "22.4", delta: "+4.1", deltaDirection: .positive),
                            OmenMetricItem(label: "Ceiling", value: "31.8"),
                        ],
                        signals: [
                            OmenSignalItem(label: "Yahoo roster snapshot", source: .live, detail: "Refreshed 4 minutes ago."),
                        ],
                        alternatives: [
                            OmenDecisionBriefAlternative(name: "Ken Walker III", position: .rb, team: "SEA", meta: "Limited practice"),
                        ]
                    )
                    VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                        OmenDecisionBrief(state: .success(payload))
                        OmenDecisionBrief(state: .stale(payload, lastSynced: "12 minutes ago"))
                        OmenDecisionBrief(state: .mock(payload))
                        OmenDecisionBrief(state: .empty("Your lineup is already optimal."))
                        OmenDecisionBrief(state: .loading)
                        OmenDecisionBrief(state: .error("The recommendation engine timed out.", retry: {}))
                        OmenDecisionBrief(state: .disconnected(connect: {}))
                        OmenDecisionBrief(state: .offSeason)
                    }
                }

                section("ConfirmationDialog — default and destructive (tap to preview)") {
                    HStack(spacing: OmenSpacing.step8) {
                        OmenButton(title: "Show default", action: { showDefaultConfirm = true })
                        OmenButton(title: "Show destructive", action: { showDestructiveConfirm = true }, variant: .danger)
                    }
                }
                .omenConfirmationDialog(
                    title: "Leave draft?",
                    message: "Your picks will be lost.",
                    isPresented: $showDefaultConfirm,
                    confirmLabel: "Leave",
                    cancelLabel: "Stay",
                    onConfirm: {}
                )
                .omenConfirmationDialog(
                    title: "Delete lineup?",
                    message: "This cannot be undone.",
                    isPresented: $showDestructiveConfirm,
                    confirmLabel: "Delete",
                    cancelLabel: "Cancel",
                    variant: .destructive,
                    onConfirm: {}
                )
            }
            .padding(OmenSpacing.step16)
        }
        .background(OmenColor.bg.ignoresSafeArea())
    }

    @ViewBuilder
    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            Text(title)
                .omenTextStyle(OmenTypography.label)
                .foregroundStyle(OmenColor.textSecondary)
            content()
        }
    }

    private var placeholderIcon: Image {
        Image(systemName: "square.fill")
    }
}

#Preview {
    DesignSystemGalleryView()
}
#endif
