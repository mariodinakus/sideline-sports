# NIGHT SHIFT Android APK

This module is a native Java Android WebView shell for the live HTTPS site \`https://night-shift-nba.vercel.app/\`. It requires an internet connection. No third-party WebView plugin, no extra permissions, no bundled fake basketball data.

## GitHub Actions build
On any push to the \`night-shift-nba\` branch changing \`android/**\` or the workflow, GitHub Actions starts \`NIGHT SHIFT · Android APK\`. After a successful run, open the run's **Artifacts** section and download **NIGHT-SHIFT-NBA-Android-APK**. Extract the ZIP and install \`app-debug.apk\` on Android.

Debug APK is for personal testing. It is not signed for release distribution via Play Store; a release signing key, keystore and release pipeline are required for that.

GitHub Actions must be enabled for the repository. If no run starts, manually enable Actions for the branch or run the project locally with JDK 17, Android SDK API 35, Gradle 8.9: \`gradle :app:assembleDebug\`.