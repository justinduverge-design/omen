package com.slopssaloon.omen

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.slopssaloon.omen.app.OmenAndroidApp
import com.slopssaloon.omen.app.auth.OAuthCallbackBus
import com.slopssaloon.omen.app.screenshot.ScreenshotScenarioHost
import com.slopssaloon.omen.app.screenshot.ScreenshotScenarios

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Screenshot short-circuit — when the native-visual-evidence CI workflow launches
        // the app with `--es OMEN_SCREENSHOT_SCENARIO <slug>`, mount only the requested
        // scenario. No session, no network. Unknown or missing key falls through to the
        // normal production shell. Cannot be triggered by an end user in a shipped build
        // because no UI surfaces this intent extra.
        val scenarioKey = intent?.getStringExtra(ScreenshotScenarios.INTENT_EXTRA)
        if (ScreenshotScenarios.isKnown(scenarioKey)) {
            setContent { ScreenshotScenarioHost(scenarioKey = scenarioKey!!) }
            return
        }
        // OAuth deep link may already be present if the browser handed us the callback
        // during the very intent that (re)created this Activity.
        forwardOAuthCallback(intent)
        setContent { OmenAndroidApp() }
    }

    // Custom Tabs is a separate process; the callback deep link comes back as a NEW intent
    // routed to the manifest's singleTask Activity, which is delivered here without replacing
    // the Compose tree that owns the pending PKCE verifier.
    // See M4-Auth-Providers-v1 §2.4 for the callback contract.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        forwardOAuthCallback(intent)
    }

    private fun forwardOAuthCallback(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.scheme == "com.slopssaloon.omen" && data.host == "auth") {
            OAuthCallbackBus.post(data)
        }
    }
}
