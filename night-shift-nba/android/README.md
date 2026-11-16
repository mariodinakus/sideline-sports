# NBA ATLAS Android

Official app label: **NBA ATLAS**. Package ID: `app.nbaatlas.mobile`. A native WebView shell for `https://nba-atlas.vercel.app/` with dark system UI, in-app SPA navigation, Android back button, safe handling of external links and an offline retry screen. Internet required for live NBA data.

Android SDK 35, Java 17, Gradle 8.9: `gradle -p night-shift-nba/android :app:assembleDebug`. The GitHub workflow validates the APK identity and uploads the built APK to `night-shift-nba/downloads/nba-atlas.apk` with SHA-256 checksum. The downloaded APK is **debug-signed for personal installation**, not Play Store release-signed. Because the new package ID differs from NIGHT SHIFT NBA, it installs as a distinct app.
