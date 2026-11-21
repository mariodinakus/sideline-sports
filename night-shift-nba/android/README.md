# NBA ATLAS Android

Official app label: **NBA ATLAS**. Package ID: `app.nbaatlas.mobile`. A native WebView shell for `https://nba-atlas.vercel.app/` with dark system UI, in-app SPA navigation, Android back button, safe handling of external links and an offline retry screen. Internet required for live NBA data.

Android SDK 35, Java 17, Gradle 8.9: `gradle -p night-shift-nba/android :app:assembleDebug`. The GitHub workflow validates the APK identity and uploads the built APK to `night-shift-nba/downloads/nba-atlas.apk` with SHA-256 checksum. The downloaded APK is **debug-signed for personal installation**, not Play Store release-signed. Because the new package ID differs from NIGHT SHIFT NBA, it installs as a distinct app.

## Version 3.0
My ATLAS profile remains local to the WebView. Enable native alerts from Profile → Alerts and grant Android notification permission. Android JobScheduler polls the public scoreboard approximately every 15+ minutes (OS-dependent, not real-time push); favorites supply their team codes, and a tap opens the game. Force-stop or battery restrictions may prevent alerts. No per-player stat notifications or cloud account. Debug-signed APK updates may require reinstall if the prior signing key differs.

## Version 3.1
Native alerts add completed quarter/halftime scores, favorite-player milestones (10, 20, 30… points up to 60), and 30/40/50-point performances from followed games. Final and period notifications include observed box score snapshots. Reopen Profile → Alerts → Save to copy current favorite-player IDs into Android. Polling may skip periods or milestones and is not immediate push. Reinstall may be needed if the prior debug signing key differs.
