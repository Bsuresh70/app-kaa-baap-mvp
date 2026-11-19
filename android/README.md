# Android app packaging plan

## Current approach
Use a Trusted Web Activity (TWA) to package the existing App Kaa Baap website rather than rebuilding its discovery and authentication features as a separate native application.

- Website: https://motherofallapps.netlify.app/
- Android application name: App Kaa Baap
- Android application ID: com.appkaabaap.app
- Initial deliverable: signed testing APK
- Primary test device: OnePlus 15R

## PWA foundation
The root site now includes a web app manifest, scalable SVG brand icon, service worker, and offline fallback page. The service worker deliberately does not cache Netlify function requests or non-GET requests. Discovery and Google sign-in still require an internet connection.

## TWA release requirements
Before generating a distributable APK:
1. Confirm the PWA manifest and service worker work on the Netlify deploy preview and production domain.
2. Generate Android launcher/adaptive icon assets in the required PNG sizes from the approved brand artwork.
3. Generate the Android project with Bubblewrap using the production manifest URL.
4. Create and securely retain the signing keystore; never commit the keystore or passwords to Git.
5. Obtain the signing certificate SHA-256 fingerprint and publish the Digital Asset Links file at `/.well-known/assetlinks.json`.
6. Build a signed APK and install it on the OnePlus 15R.
7. Test discovery, Google OAuth return flow, external links, offline behaviour, and display.

## Important
A web preview is not an APK. The APK is not ready until the signing identity and Digital Asset Links association are configured and the signed build has been installed and tested.
