pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "OmenAndroid"
include(":app")
include(":core:auth")
include(":core:designsystem")
include(":core:models")
include(":core:network")
include(":core:session")
