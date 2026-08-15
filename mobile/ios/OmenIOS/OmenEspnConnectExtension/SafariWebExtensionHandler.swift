import SafariServices

/// M7-EspnSafariExtension — the native host for the bundled Safari Web Extension.
///
/// Omen's extension is entirely web-side: it reads the user's own ESPN cookies via the
/// WebExtension `cookies` API and fills them into Omen's connect form. It has **no**
/// `sendNativeMessage` path, so this handler exists only because Safari requires an
/// `NSExtensionPrincipalClass` for a web-extension target.
///
/// Apple's converter template logs the incoming message with `os_log`. That is deliberately
/// **removed** here: any native message would be extension payload, and this extension exists
/// to handle ESPN session cookies. Facts-of-record #6 — cookie values are never logged,
/// displayed, or echoed. Anywhere. Ever. A template default is not a reason to weaken that.
final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        // Acknowledge and return nothing. No message content is read, inspected, or logged.
        let response = NSExtensionItem()
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
