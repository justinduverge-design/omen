package com.slopssaloon.omen

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.slopssaloon.omen.app.OmenAndroidApp
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
        setContent { OmenAndroidApp() }
    }
}
