import SwiftUI

struct OmenModalSheet<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content
    init(title: String, @ViewBuilder content: () -> Content) { self.title = title; self.content = content() }
    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.headerToBody) {
            Text(title).omenTextStyle(OmenTypography.h2).foregroundStyle(OmenColor.textPrimary)
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(OmenSpacing.cardInterior)
        .background(OmenColor.surface1)
    }
}
