import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins { alias(libs.plugins.android.library) }

android {
    namespace = "com.slopssaloon.omen.core.session"
    compileSdk = 37
    defaultConfig {
        minSdk = 26
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    testOptions { unitTests.isReturnDefaultValues = true }
}

kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }

dependencies {
    implementation(libs.kotlinx.coroutines.core)
    testImplementation(libs.junit)
    testImplementation(libs.kotlin.test.junit)
    testImplementation(libs.kotlinx.coroutines.test)

    // AndroidKeyStore has no plain-JVM provider, so AndroidKeystoreSessionStoreTest (S5) needs a
    // real Android runtime — same reason core/designsystem's androidTest exists.
    androidTestImplementation(libs.androidx.test.ext.junit)
    // androidx.test.ext:junit alone does not pull in the androidx.test:runner class that
    // testInstrumentationRunner names; espresso-core carries it transitively.
    androidTestImplementation(libs.androidx.espresso.core)
}
