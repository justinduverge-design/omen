package com.slopssaloon.omen.core.network

import com.slopssaloon.omen.BuildConfig

data class AppEnvironment(
    val apiBaseUrl: String,
    val demoModeEnabled: Boolean,
    val supabaseUrl: String,
    val supabaseAnonKey: String,
    val googleWebClientId: String,
) {
    /** True only when the Google Web client ID is provisioned (M0c §2.1). */
    val googleSignInConfigured: Boolean get() = googleWebClientId.isNotBlank()

    /** True when Supabase public config is present so auth can be wired live. */
    val supabaseConfigured: Boolean get() = supabaseUrl.isNotBlank() && supabaseAnonKey.isNotBlank()

    companion object {
        fun fromBuildConfig() = AppEnvironment(
            apiBaseUrl = BuildConfig.OMEN_API_BASE_URL,
            demoModeEnabled = BuildConfig.OMEN_DEMO_MODE_ENABLED,
            supabaseUrl = BuildConfig.OMEN_SUPABASE_URL,
            supabaseAnonKey = BuildConfig.OMEN_SUPABASE_ANON_KEY,
            googleWebClientId = BuildConfig.OMEN_GOOGLE_WEB_CLIENT_ID,
        )
    }
}
