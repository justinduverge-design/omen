import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.slopssaloon.omen.core.designsystem"
    compileSdk = 37
    defaultConfig {
        minSdk = 26
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    buildFeatures { compose = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    testOptions { unitTests.isReturnDefaultValues = true }
}

kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    // WindowCompat, for the status-bar appearance the theme sets (F-VET-B04). The theme is the
    // only thing that knows whether the app painted dark or light, so it is the only place that
    // can tell the system bars.
    implementation(libs.androidx.core.ktx)
    testImplementation(libs.junit)
    testImplementation(libs.kotlin.test.junit)

    // Instrumented Compose UI tests prove real focus/disabled/loading/a11y semantics on-device
    // (registry §4 acceptance evidence) — no JVM-only equivalent without adding Robolectric.
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.kotlin.test.junit)
    debugImplementation(libs.androidx.compose.ui.test.manifest)

    // Debug-only gallery Activity for on-device screenshot evidence (never in release).
    debugImplementation(libs.androidx.activity.compose)
}

/**
 * `PrimitiveEnforcementTest` scans Kotlin sources in **other** modules — `app/src/main/kotlin`
 * and any future `feature/` subtree — by walking the filesystem. Gradle has no way to know that,
 * so those files are not task inputs, and `testDebugUnitTest` is happily UP-TO-DATE after an
 * `app/` edit that introduces a violation.
 *
 * That is not theoretical. On 2026-09-07 a comment added to `OmenAuthFlow.kt` contained a hex
 * literal in the banned shape; the very next `:core:designsystem:testDebugUnitTest` reported
 * BUILD SUCCESSFUL because nothing in this module had changed. The guardrail was green while the
 * thing it guards was red — the exact failure mode the scanner exists to prevent, one layer up.
 *
 * Declaring the scanned trees as inputs makes an `app/` edit invalidate the task, so the scan
 * actually re-runs. `PathSensitivity.RELATIVE` keeps caching useful.
 *
 * Only directories that exist are declared. `inputs.dir(...).optional(true)` looks like it covers
 * an absent one and does not — Gradle still validates the path and fails the task configuration
 * with "Input file does not exist". `feature/` has no module yet, so it is filtered here and will
 * start being tracked automatically on the day it appears.
 */
tasks.withType<Test>().configureEach {
    listOf("app/src/main/kotlin", "feature")
        .map { rootProject.layout.projectDirectory.dir(it) }
        .filter { it.asFile.isDirectory }
        .forEach { dir ->
            inputs.dir(dir)
                .withPathSensitivity(PathSensitivity.RELATIVE)
                .withPropertyName("primitiveEnforcementScanRoot-${dir.asFile.name}")
        }
}
