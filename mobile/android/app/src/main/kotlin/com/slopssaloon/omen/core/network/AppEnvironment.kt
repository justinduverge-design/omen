package com.slopssaloon.omen.core.network

import com.slopssaloon.omen.BuildConfig

data class AppEnvironment(
    val apiBaseUrl: String,
    val demoModeEnabled: Boolean,
) {
    companion object {
        fun fromBuildConfig() = AppEnvironment(
            apiBaseUrl = BuildConfig.OMEN_API_BASE_URL,
            demoModeEnabled = BuildConfig.OMEN_DEMO_MODE_ENABLED,
        )
    }
}
