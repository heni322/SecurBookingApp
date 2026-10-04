# Release signing (Android)

Release builds are signed with an **upload key** that only the Play Console
owner holds. They are never signed with the debug key: a release task
(`assembleRelease`, `bundleRelease`, `installRelease`) fails if the key is
not configured.

## 1. Create the upload key (once, by the Play Console owner)

```sh
keytool -genkeypair -v -storetype PKCS12 -keystore upload-key.jks \
  -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Store the file and both passwords in the company password manager. Enrol the
app (com.securbookingapp) in **Play App Signing** so Google keeps the app signing key and a
lost upload key can be reset.

## 2. Configure a machine

Either copy `android/keystore.properties.example` to
`android/keystore.properties` (git-ignored) and fill it in, or set:

| Variable | Value |
| --- | --- |
| `ANDROID_UPLOAD_STORE_FILE` | path to the .jks (relative to `android/app` or absolute) |
| `ANDROID_UPLOAD_STORE_PASSWORD` | keystore password |
| `ANDROID_UPLOAD_KEY_ALIAS` | `upload` |
| `ANDROID_UPLOAD_KEY_PASSWORD` | key password |

In CI, keep the .jks as a base64 secret, decode it to a temporary file and
point `ANDROID_UPLOAD_STORE_FILE` at it.

## 3. Build

```sh
cd android
./gradlew bundleRelease -PversionCode=2 -PversionName=1.0.1
```

`versionCode` must increase with every upload to the Play Store; it defaults to
1 when not passed.

iOS signing is configured in Xcode (team, provisioning profile) and is not
covered here.