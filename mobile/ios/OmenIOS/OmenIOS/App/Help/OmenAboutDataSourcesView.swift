import SwiftUI

/// Fixed wording for the nflverse credit. CC BY 4.0 requires attribution, a license link and a
/// note of changes; the credit is contractual, not editorial copy, so it lives in one place
/// and a test pins it.
enum OmenDataSources {
    static let nflverseCredit = "Player and usage statistics: nflverse data, CC BY 4.0."
    static let nflverseURL = URL(string: "https://github.com/nflverse/nflverse-data")!
    static let nflverseLicenseURL = URL(string: "https://creativecommons.org/licenses/by/4.0/")!
    static let nflverseChanges = "Omen aggregates and reformats this data; it is not endorsed by nflverse."
    /// The league data is the user's own, read through the accounts they connected. Omen does
    /// not supply or sell it.
    static let providerData = "Your league, roster, scoring and matchup data comes from the ESPN, Yahoo or Sleeper account you connected. It is your own data, read with your permission, and Omen never posts or trades for you."
}

/// "About / Data sources", reachable from Account and from Help + Support.
struct OmenAboutDataSourcesView: View {
    /// Supplied when the screen is presented as a sheet, so it has an explicit way out.
    var onDone: (() -> Void)?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.sectionStack) {
                Text("About Omen")
                    .omenTextStyle(OmenTypography.h1)
                    .foregroundStyle(OmenColor.textPrimary)

                OmenCard {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        Text("Data sources")
                            .omenTextStyle(OmenTypography.h2)
                            .foregroundStyle(OmenColor.textPrimary)
                        Text(OmenDataSources.nflverseCredit)
                            .omenTextStyle(OmenTypography.body)
                            .foregroundStyle(OmenColor.textPrimary)
                        Text(OmenDataSources.nflverseChanges)
                            .omenTextStyle(OmenTypography.bodySmall)
                            .foregroundStyle(OmenColor.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                        Link("github.com/nflverse/nflverse-data", destination: OmenDataSources.nflverseURL)
                            .omenTextStyle(OmenTypography.bodySmall)
                            .foregroundStyle(OmenColor.accent)
                        Link("CC BY 4.0 license", destination: OmenDataSources.nflverseLicenseURL)
                            .omenTextStyle(OmenTypography.bodySmall)
                            .foregroundStyle(OmenColor.accent)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                OmenCard {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        Text("Your league data")
                            .omenTextStyle(OmenTypography.h2)
                            .foregroundStyle(OmenColor.textPrimary)
                        Text(OmenDataSources.providerData)
                            .omenTextStyle(OmenTypography.bodySmall)
                            .foregroundStyle(OmenColor.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                if let onDone {
                    OmenButton(title: "Done", action: onDone, variant: .secondary, size: .lg)
                        .frame(maxWidth: .infinity)
                }

                if omenShowsYahooAttribution {
                    OmenCard(variant: .outlined) {
                        Text(omenYahooAttributionText)
                            .omenTextStyle(OmenTypography.bodySmall)
                            .foregroundStyle(OmenColor.textSecondary)
                    }
                }
            }
            .padding(OmenSpacing.step24)
        }
        .background(OmenColor.bg)
        .navigationTitle("About & data sources")
        .navigationBarTitleDisplayMode(.inline)
        .accessibilityIdentifier("about.data-sources")
    }
}
