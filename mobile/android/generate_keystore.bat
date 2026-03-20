@echo off
cd /d "%~dp0"
"C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkey -v -keystore app\upload-keystore.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload -storepass simly1234 -keypass simly1234 -dname "CN=Simly, OU=Simly, O=Simly, L=Paris, S=IDF, C=FR"
echo.
if exist "app\upload-keystore.jks" (
    echo [SUCCES] Le fichier upload-keystore.jks a ete cree dans le dossier app!
) else (
    echo [ERREUR] La creation du keystore a echoue.
)
pause
