package com.slopssaloon.omen.app.feature.connect

import android.annotation.SuppressLint
import android.net.Uri
import android.webkit.CookieManager
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.delay

/**
 * W1-A — the in-app ESPN sign-in surface. iOS mirror: `App/Connect/EspnWebSignIn.swift`.
 *
 * **Read this before changing anything in this file.**
 *
 * This hosts ESPN's own sign-in inside an app-controlled [WebView]. That reverses onboarding
 * contract §87, which bans exactly this for provider logins on the grounds that an app-controlled
 * web view *can* read what a user types into a provider's form. The founder lifted that rule for
 * ESPN specifically on 2026-09-02, with the App Review exposure stated; the record is in
 * `Direction/decision_log.md`. It is not lifted for Yahoo, which keeps its Custom Tabs round trip.
 *
 * Because the ban exists for a real reason, the mitigations are not optional:
 *
 * - **No JavaScript is injected into ESPN's pages.** No `evaluateJavascript`, no
 *   `addJavascriptInterface`, no `WebViewClient` script hooks. Omen reads the cookie jar the
 *   platform maintains and nothing else. Reading a password field would be trivial here and is
 *   precisely what §87 forbids.
 * - **JavaScript is enabled but never injected** — ESPN's sign-in does not render without it.
 * - **The jar is cleared on entry and on exit**, so a session never outlives the sheet. Android
 *   has no per-WebView cookie store the way iOS has a non-persistent `WKWebsiteDataStore`, so
 *   this is the equivalent guarantee and it has to be explicit.
 * - **Captured values never enter [ConnectState]**, which is compared and interpolated in test
 *   failures; the capture lives in one private field on the view model.
 * - **[EspnCapture] overrides `toString`**, because a Kotlin data class would otherwise print the
 *   session into any log line that touched it.
 *
 * The mechanism was proven before it was built: `HttpOnlyCookieSpikeTest` shows `CookieManager`
 * returns HttpOnly cookie values on Android.
 */
object EspnWebSignIn {
    /**
     * Where the sheet starts: the page that reliably makes ESPN ask for a sign-in.
     *
     * Chosen from behavior observed on a real iPhone, not from reading ESPN's markup — two other
     * URLs were tried and rejected there. `/football/team` renders *a* league, so with no
     * `leagueId` it serves ESPN's "Invalid league ID" page; that is fine as an entry (it prompts
     * the login) and wrong as a destination, which is what [AFTER_SIGN_IN_URL] fixes.
     * `/football/welcome` is ESPN's new-user signup pitch and stranded an existing manager.
     */
    const val ENTRY_URL = "https://fantasy.espn.com/football/team"

    /** Where the user goes once ESPN has a session and the page names no league. */
    const val AFTER_SIGN_IN_URL = "https://www.espn.com/fantasy/football/"

    /**
     * ESPN issues these under more than one domain scope, and a stale value under one can coexist
     * with a valid one under another — the failure `extension/popup.js` exists to diagnose.
     */
    val COOKIE_DOMAIN_PREFERENCE = listOf(
        "https://www.espn.com",
        "https://fantasy.espn.com",
        "https://espn.com",
    )

    /**
     * Pulls the league and team out of whatever ESPN page the user is on.
     *
     * Matches `normalizeEspnLeagueId` on the server, which accepts `leagueId` or `league_id`.
     * Anything not on an espn.com host is ignored outright, so a redirect through an identity
     * provider cannot be mistaken for a league page. The fragment is read as well as the query
     * because ESPN client-routes between fantasy pages.
     */
    fun leagueAndTeam(url: String?): Pair<String?, String?> {
        val uri = runCatching { Uri.parse(url ?: return null to null) }.getOrNull()
            ?: return null to null
        val host = uri.host ?: return null to null
        if (!host.endsWith("espn.com")) return null to null

        // A fragment like `/team?leagueId=1` is not parsed as a query by Uri, so it is re-parsed.
        val fragmentUri = uri.fragment
            ?.substringAfter('?', "")
            ?.takeIf { it.isNotEmpty() }
            ?.let { runCatching { Uri.parse("https://x/?$it") }.getOrNull() }

        fun param(names: List<String>): String? {
            for (name in names) {
                runCatching { uri.getQueryParameter(name) }.getOrNull()
                    ?.takeIf { it.isNotEmpty() }
                    ?.let { return it }
                runCatching { fragmentUri?.getQueryParameter(name) }.getOrNull()
                    ?.takeIf { it.isNotEmpty() }
                    ?.let { return it }
            }
            return null
        }

        return param(listOf("leagueId", "league_id")) to param(listOf("teamId", "team_id"))
    }

    /**
     * Picks a cookie out of the jar string by the same domain preference the desktop helper uses.
     *
     * Exact host first, across the whole preference order, **before** any suffix fallback — a
     * dot-prefixed `.espn.com` cookie is a suffix of `www.espn.com`, so folding the two passes
     * into one lets a stale wildcard value win the host-scoped slot. That is the ESPN failure the
     * extension was written to diagnose: the server rejects the stale value and says nothing.
     */
    fun cookieValue(name: String, jarByDomain: Map<String, String?>): String? {
        for (domain in COOKIE_DOMAIN_PREFERENCE) {
            val value = parseCookie(name, jarByDomain[domain])
            if (!value.isNullOrEmpty()) return value
        }
        return null
    }

    /** `CookieManager.getCookie` returns one `a=1; b=2` header string, not a map. */
    fun parseCookie(name: String, jar: String?): String? {
        if (jar.isNullOrEmpty()) return null
        for (pair in jar.split(";")) {
            val separator = pair.indexOf('=')
            if (separator == -1) continue
            if (pair.substring(0, separator).trim().equals(name, ignoreCase = true)) {
                return pair.substring(separator + 1).trim().takeIf { it.isNotEmpty() }
            }
        }
        return null
    }
}

/**
 * Reads `espn_s2` and `SWID` from the platform cookie jar.
 *
 * **This type is the only place in the app that touches those values.** No logging, no analytics,
 * no persistence, and no `toString` that could carry them anywhere.
 */
interface EspnCookieReader {
    fun hasSession(): Boolean
    /** Reads them out. Called once, at the moment the user presses Connect. */
    fun takeSession(): Pair<String, String>?
    /** Presence and host only — **never a value**. Mirrors `extension/popup.js`'s diagnostic. */
    fun sessionDiagnostic(): String
    /** Drops every ESPN cookie, so a session never outlives the sheet. */
    fun clear()
}

class AndroidEspnCookieReader(
    private val cookies: CookieManager = CookieManager.getInstance(),
) : EspnCookieReader {

    private fun jar(): Map<String, String?> =
        EspnWebSignIn.COOKIE_DOMAIN_PREFERENCE.associateWith { cookies.getCookie(it) }

    override fun hasSession(): Boolean = takeSession() != null

    override fun takeSession(): Pair<String, String>? {
        val jar = jar()
        val espnS2 = EspnWebSignIn.cookieValue("espn_s2", jar) ?: return null
        val swid = EspnWebSignIn.cookieValue("SWID", jar) ?: return null
        return espnS2 to swid
    }

    override fun sessionDiagnostic(): String {
        val jar = jar()
        fun describe(name: String): String {
            val hosts = jar.filterValues { EspnWebSignIn.parseCookie(name, it) != null }
                .keys
                .map { it.removePrefix("https://") }
                .sorted()
            return if (hosts.isEmpty()) "$name: not found" else "$name: ${hosts.joinToString(", ")}"
        }
        // Host names only. No value, no length, no prefix — a length is a hint and a prefix is a
        // leak, and neither helps diagnose anything.
        return "${describe("espn_s2")} · ${describe("SWID")}"
    }

    override fun clear() {
        cookies.removeAllCookies(null)
        cookies.flush()
    }
}

/**
 * Presents ESPN's site and reports when a session and a league become visible.
 *
 * Nothing here decides to connect. It observes, and hands the decision up.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun EspnWebSignInView(
    reader: EspnCookieReader,
    onProgress: (EspnSignInProgress) -> Unit,
    modifier: Modifier = Modifier,
) {
    val progress = rememberUpdatedState(onProgress)

    // Cleared on entry so a previous attempt cannot look like a fresh sign-in, and on exit so no
    // ESPN session outlives the sheet. Android's cookie jar is process-wide — unlike iOS, where a
    // non-persistent data store gives this for free — so it has to be explicit on both edges.
    DisposableEffect(reader) {
        reader.clear()
        onDispose { reader.clear() }
    }

    // Polls rather than relying only on page-finished callbacks.
    //
    // ESPN's sign-in completes through redirects and XHR, so by the time the session cookies land
    // the visible page has often finished loading and no further callback fires. On iOS that
    // exact assumption left a signed-in user staring at a dead Connect button while the ESPN
    // account avatar was visible on screen. One second, reading an in-memory jar, no network.
    var currentUrl by remember { mutableStateOf<String?>(null) }
    var redirectedAfterSignIn by remember { mutableStateOf(false) }
    var pendingLoad by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(reader) {
        while (true) {
            val (leagueId, teamId) = EspnWebSignIn.leagueAndTeam(currentUrl)
            if (reader.hasSession()) {
                progress.value(EspnSignInProgress.SignedIn(leagueId, teamId))
                // Just signed in and sitting on a page that names no league — which on the entry
                // URL is ESPN's "Invalid league ID" error. Move them somewhere useful, once.
                if (leagueId == null && !redirectedAfterSignIn) {
                    redirectedAfterSignIn = true
                    pendingLoad = EspnWebSignIn.AFTER_SIGN_IN_URL
                }
            } else {
                progress.value(EspnSignInProgress.SignedOut(reader.sessionDiagnostic()))
            }
            delay(1_000)
        }
    }

    AndroidView(
        modifier = modifier,
        factory = { context ->
            WebView(context).apply {
                // Required: ESPN's sign-in does not render without it. Nothing is ever injected —
                // see the file header.
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        currentUrl = url
                    }
                }
                loadUrl(EspnWebSignIn.ENTRY_URL)
            }
        },
        update = { view ->
            pendingLoad?.let {
                pendingLoad = null
                view.loadUrl(it)
            }
        },
    )
}
