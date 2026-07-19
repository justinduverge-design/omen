import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.slopssaloon.omen"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.slopssaloon.omen"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        debug {
            buildConfigField("String", "OMEN_API_BASE_URL", "\"https://example.invalid\"")
            buildConfigField("Boolean", "OMEN_DEMO_MODE_ENABLED", "true")
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
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
}
