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
fun cfg(key: String): String = (localProps.getProperty(key) ?: "").trim()

android {
    namespace = "com.slopssaloon.omen"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.slopssaloon.omen"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        debug {
            buildConfigField("String", "OMEN_API_BASE_URL", "\"https://example.invalid\"")
            buildConfigField("Boolean", "OMEN_DEMO_MODE_ENABLED", "true")
            buildConfigField("String", "OMEN_SUPABASE_URL", "\"${cfg("omen.supabaseUrl")}\"")
            buildConfigField("String", "OMEN_SUPABASE_ANON_KEY", "\"${cfg("omen.supabaseAnonKey")}\"")
            buildConfigField("String", "OMEN_GOOGLE_WEB_CLIENT_ID", "\"${cfg("omen.googleWebClientId")}\"")
        }
        create("staging") {
            initWith(getByName("debug"))
            matchingFallbacks += listOf("debug")
            buildConfigField("String", "OMEN_API_BASE_URL", "\"https://example.invalid\"")
            buildConfigField("Boolean", "OMEN_DEMO_MODE_ENABLED", "true")
        }
        release {
            isMinifyEnabled = false
            buildConfigField("String", "OMEN_API_BASE_URL", "\"https://example.invalid\"")
            buildConfigField("Boolean", "OMEN_DEMO_MODE_ENABLED", "true")
            buildConfigField("String", "OMEN_SUPABASE_URL", "\"${cfg("omen.supabaseUrl")}\"")
            buildConfigField("String", "OMEN_SUPABASE_ANON_KEY", "\"${cfg("omen.supabaseAnonKey")}\"")
            buildConfigField("String", "OMEN_GOOGLE_WEB_CLIENT_ID", "\"${cfg("omen.googleWebClientId")}\"")
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
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
