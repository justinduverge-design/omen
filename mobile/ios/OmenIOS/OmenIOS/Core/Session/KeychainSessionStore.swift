import Foundation
import Security

/// Production `SecureSessionStore` backed by iOS Keychain Services (M0c §2.2). The Keychain
/// itself encrypts item data at rest, so unlike Android (where `SharedPreferences` is plaintext
/// and must be manually AES/GCM-encrypted via the Keystore), no manual encryption step is
/// needed here — this is a deliberate, documented platform difference, not a shortcut.
///
/// `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` keeps the session usable for background
/// refreshes after first unlock, never migrates with backups to a new device, and never syncs
/// via iCloud Keychain.
final class KeychainSessionStore: SecureSessionStore {
    private let service: String
    private let account: String

    init(service: String = "com.slopssaloon.omen.session", account: String = "current") {
        self.service = service
        self.account = account
    }

    func save(_ session: Session) throws {
        let data = try JSONEncoder().encode(CodableSession(session))
        SecItemDelete(baseQuery() as CFDictionary)

        var addQuery = baseQuery()
        addQuery[kSecValueData as String] = data
        addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        let status = SecItemAdd(addQuery as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.unhandled(status: status)
        }
    }

    func load() -> Session? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }

        // Any decode failure (corruption, format drift) fails safe to "no session" rather than
        // crashing or surfacing a half-valid session, mirroring the Android Keystore store.
        guard let decoded = try? JSONDecoder().decode(CodableSession.self, from: data) else {
            clear()
            return nil
        }
        return decoded.session
    }

    func clear() {
        SecItemDelete(baseQuery() as CFDictionary)
    }

    private func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }
}

enum KeychainError: Error {
    case unhandled(status: OSStatus)
}

private struct CodableSession: Codable {
    let userID: String
    let accessToken: String
    let refreshToken: String
    let expiresAtEpochSeconds: Int64

    init(_ session: Session) {
        userID = session.userID
        accessToken = session.accessToken
        refreshToken = session.refreshToken
        expiresAtEpochSeconds = session.expiresAtEpochSeconds
    }

    var session: Session {
        Session(
            userID: userID,
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAtEpochSeconds: expiresAtEpochSeconds
        )
    }
}
