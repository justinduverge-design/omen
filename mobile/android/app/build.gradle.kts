import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

// Public client config from git-ignored local.properties (never hardcoded, never committed).
// The Supabase anon key is RLS-protected public config; the Google Web client ID is optional
// until provisioned (empty string => Google sign-in reports "not configured" honestly).
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

/**
 * Resolution order: environment variable first, then `local.properties`, then "".
 * The env path exists so CI can supply config without a checked-in file; the
 * `local.properties` path is the developer-machine equivalent. Neither is committed.
 *
 * `omen.supabaseUrl` -> `OMEN_SUPABASE_URL`, `omen.releaseKeyAlias` -> `OMEN_RELEASE_KEY_ALIAS`.
 */
fun cfg(key: String): String {
    val envKey = key.removePrefix("omen.")
        .replace(Regex("([a-z0-9])([A-Z])"), "$1_$2")
        .uppercase()
        .let { "OMEN_$it" }
    return (System.getenv(envKey) ?: localProps.getProperty(key) ?: "").trim()
}

// A build that still points here is not shippable. Kept explicit so the guard below
// can recognise it rather than silently emitting an app that talks to nothing.
val PLACEHOLDER_API_BASE_URL = "https://example.invalid"

// Production API origin. Paths are appended as `/api/...` (see OkHttpAccountRepository).
val PRODUCTION_API_BASE_URL = "https://slopssaloon.com"

fun apiBaseUrl(key: String, fallback: String): String =
    cfg(key).ifBlank { fallback }

val releaseApiBaseUrl = apiBaseUrl("omen.apiBaseUrl", PRODUCTION_API_BASE_URL)
val debugApiBaseUrl = apiBaseUrl("omen.debugApiBaseUrl", PLACEHOLDER_API_BASE_URL)
val stagingApiBaseUrl = apiBaseUrl("omen.stagingApiBaseUrl", PLACEHOLDER_API_BASE_URL)

// Release signing. Absent keystore config yields an unsigned build, which the guard
// below rejects unless explicitly allowed — an unsigned AAB is rejected by Play, and
// finding that out at upload time wastes a cycle.
val releaseStoreFile = cfg("omen.releaseStoreFile")
val hasReleaseSigning = releaseStoreFile.isNotBlank() && rootProject.file(releaseStoreFile).exists()

android {
    namespace = "com.slopssaloon.omen"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.slopssaloon.omen"
        minSdk = 26
        targetSdk = 36
        // Bumped 2026-08-30. Version code 1 was accepted by Play on 2026-08-18 and Play
        // rejects a duplicate outright — the same reason iOS CURRENT_PROJECT_VERSION moved to
        // 2. Neither store will take today's work under the version number the last build used.
        versionCode = 3
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = rootProject.file(releaseStoreFile)
                storePassword = cfg("omen.releaseStorePassword")
                keyAlias = cfg("omen.releaseKeyAlias")
                keyPassword = cfg("omen.releaseKeyPassword")
            }
        }
    }

    buildTypes {
        debug {
            buildConfigField("String", "OMEN_API_BASE_URL", "\"$debugApiBaseUrl\"")
            // Restored 2026-08-30: App Store review notes tell the reviewer to tap "Try Demo",
            // so hiding it fails Beta App Review. See AppEnvironment.swift for the full reason.
            buildConfigField("Boolean", "OMEN_DEMO_MODE_ENABLED", "true")
            buildConfigField("String", "OMEN_SUPABASE_URL", "\"${cfg("omen.supabaseUrl")}\"")
            buildConfigField("String", "OMEN_SUPABASE_ANON_KEY", "\"${cfg("omen.supabaseAnonKey")}\"")
            buildConfigField("String", "OMEN_GOOGLE_WEB_CLIENT_ID", "\"${cfg("omen.googleWebClientId")}\"")
            buildConfigField("String", "OMEN_ANDROID_SENTRY_DSN", "\"${cfg("omen.androidSentryDsn")}\"")
        }
        create("staging") {
            initWith(getByName("debug"))
            matchingFallbacks += listOf("debug")
            buildConfigField("String", "OMEN_API_BASE_URL", "\"$stagingApiBaseUrl\"")
            // Restored 2026-08-30, same reason as debug.
            buildConfigField("Boolean", "OMEN_DEMO_MODE_ENABLED", "true")
        }
        release {
            isMinifyEnabled = false
            // Demo mode is OFF in release. A shipped build must never present mock
            // output as live fantasy advice — see the guardrail in Direction/current_sprint.md
            // and the F9 mock/live labeling gate.
            buildConfigField("String", "OMEN_API_BASE_URL", "\"$releaseApiBaseUrl\"")
            // Release keeps demo ON for the beta: the App Store reviewer needs a way into the
            // app, and the review notes promise one. Revisit when the beta closes.
            buildConfigField("Boolean", "OMEN_DEMO_MODE_ENABLED", "true")
            buildConfigField("String", "OMEN_SUPABASE_URL", "\"${cfg("omen.supabaseUrl")}\"")
            buildConfigField("String", "OMEN_SUPABASE_ANON_KEY", "\"${cfg("omen.supabaseAnonKey")}\"")
            buildConfigField("String", "OMEN_GOOGLE_WEB_CLIENT_ID", "\"${cfg("omen.googleWebClientId")}\"")
            buildConfigField("String", "OMEN_ANDROID_SENTRY_DSN", "\"${cfg("omen.androidSentryDsn")}\"")
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

/**
 * Release shippability guard.
 *
 * Runs only when a release artifact is actually being produced, so debug and test
 * builds are unaffected. Each of these three shipped silently before 2026-08-05:
 * the release build pointed at `example.invalid`, ran with demo mode ON, and was
 * unsigned. Every one of them fails late and confusingly — a tester sees "the
 * backend is down", or reads mock output as real advice, or Play rejects the
 * upload. Failing here converts all three into a build error with a fix in it.
 *
 * Set OMEN_ALLOW_UNSIGNED_RELEASE=true to build an unsigned release deliberately
 * (local verification only — never for an upload).
 */
gradle.taskGraph.whenReady {
    val producingRelease = allTasks.any { task ->
        (task.name.startsWith("assemble") || task.name.startsWith("bundle")) &&
            task.name.contains("Release")
    }
    if (!producingRelease) return@whenReady

    val problems = buildList {
        if (releaseApiBaseUrl.isBlank() || releaseApiBaseUrl == PLACEHOLDER_API_BASE_URL) {
            add(
                "OMEN_API_BASE_URL resolves to '$releaseApiBaseUrl'. A release build must " +
                    "point at a real API origin. Set `omen.apiBaseUrl` in local.properties " +
                    "or OMEN_API_BASE_URL in the environment."
            )
        }
        if (!hasReleaseSigning && System.getenv("OMEN_ALLOW_UNSIGNED_RELEASE") != "true") {
            add(
                "No release signing configured, so this would produce an unsigned artifact " +
                    "that Google Play rejects. Set `omen.releaseStoreFile`, " +
                    "`omen.releaseStorePassword`, `omen.releaseKeyAlias`, and " +
                    "`omen.releaseKeyPassword`. To build unsigned on purpose, set " +
                    "OMEN_ALLOW_UNSIGNED_RELEASE=true."
            )
        }
    }

    if (problems.isNotEmpty()) {
        throw GradleException(
            "Release build is not shippable:\n" +
                problems.joinToString("\n") { "  - $it" }
        )
    }
}

dependencies {
    implementation(project(":core:auth"))
    implementation(project(":core:designsystem"))
    implementation(project(":core:models"))
    implementation(project(":core:network"))
    implementation(project(":core:session"))
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.androidx.browser)
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services.auth)
    implementation(libs.googleid)
    implementation(libs.okhttp)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    // JVM unit tests for `:app`. Added 2026-08-16 after the missing source set cost a second
    // slice: M5 slices A-D and the R7 copy ban all wrote PURE LOGIC tests that had to run in
    // `androidTest` on a booted emulator because `:app` had nowhere else to put them — ~50s
    // and an AVD for assertions that touch no Android framework class.
    //
    // No new dependency: `libs.junit` and `libs.kotlin.test.junit` are already in the version
    // catalog and already used by every `:core:*` module. This enables a source set with
    // libraries the project has, rather than pulling anything in.
    //
    // Rule of thumb for where a test goes: if it needs a Compose semantics tree, a real
    // Context, or a device behaviour, it belongs in `androidTest`. Otherwise `src/test`.
    testImplementation(libs.junit)
    testImplementation(libs.kotlin.test.junit)
    // TEST-ONLY. The android.jar on the unit-test classpath ships `org.json` as stubs that
    // throw from every method, so contract-parsing code cannot be unit-tested without the
    // real implementation. The alternative — `unitTests.isReturnDefaultValues = true` —
    // returns nulls and zeros instead of throwing, which would turn "this parser is broken"
    // into a quietly passing test. This never reaches the app: at runtime Android supplies
    // its own `org.json`, so production behaviour is unchanged.
    testImplementation(libs.json.unit.test)
    // Added for PlayerSearchTest: the search path is suspending, and its URL construction is
    // the part real use exposed and unit tests had no way to reach.
    testImplementation(libs.kotlinx.coroutines.test)

    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
