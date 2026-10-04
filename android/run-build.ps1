$env:JAVA_HOME="C:\Program Files\Java\jdk-17"
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
$env:ANDROID_HOME="C:\Users\heniz\AppData\Local\Android\Sdk"
cd D:\SecurBookingApp\android
.\gradlew.bat assembleRelease --no-daemon *> D:\SecurBookingApp\android\build-release.log
"EXITCODE=$LASTEXITCODE" | Out-File -Append D:\SecurBookingApp\android\build-release.log
