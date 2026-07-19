#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

REPO="${1:-andresaavelasquez-ctrl/Blockbench-Mobile-Community}"
SIGNING_DIR="${HOME}/.blockbench-mobile-signing"
KEYSTORE="${SIGNING_DIR}/blockbench-mobile-release.p12"
INFO_FILE="${SIGNING_DIR}/signing-info.txt"
ALIAS="blockbench-mobile"

for command in gh keytool openssl base64; do
  command -v "${command}" >/dev/null 2>&1 || {
    echo "Falta el comando: ${command}"
    echo "Instala dependencias con:"
    echo "pkg install gh openjdk-21 openssl coreutils -y"
    exit 1
  }
done

gh auth status >/dev/null

mkdir -p "${SIGNING_DIR}"
chmod 700 "${SIGNING_DIR}"

if [[ -f "${KEYSTORE}" && -f "${INFO_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${INFO_FILE}"
  echo "Usando firma estable existente: ${KEYSTORE}"
else
  STORE_PASSWORD="$(openssl rand -hex 24)"
  KEY_PASSWORD="${STORE_PASSWORD}"

  keytool -genkeypair \
    -storetype PKCS12 \
    -keystore "${KEYSTORE}" \
    -storepass "${STORE_PASSWORD}" \
    -keypass "${KEY_PASSWORD}" \
    -alias "${ALIAS}" \
    -keyalg RSA \
    -keysize 4096 \
    -validity 10000 \
    -dname "CN=Blockbench Mobile Community, OU=Personal Build, O=Andres, L=Local, ST=Local, C=US"

  cat > "${INFO_FILE}" <<EOF
STORE_PASSWORD='${STORE_PASSWORD}'
KEY_PASSWORD='${KEY_PASSWORD}'
ALIAS='${ALIAS}'
KEYSTORE='${KEYSTORE}'
EOF
  chmod 600 "${KEYSTORE}" "${INFO_FILE}"
fi

KEYSTORE_BASE64="$(base64 "${KEYSTORE}" | tr -d '\n')"

gh secret set ANDROID_KEYSTORE_BASE64 --repo "${REPO}" --body "${KEYSTORE_BASE64}"
gh secret set ANDROID_KEYSTORE_PASSWORD --repo "${REPO}" --body "${STORE_PASSWORD}"
gh secret set ANDROID_KEY_ALIAS --repo "${REPO}" --body "${ALIAS}"
gh secret set ANDROID_KEY_PASSWORD --repo "${REPO}" --body "${KEY_PASSWORD}"

echo
echo "Firma estable configurada en GitHub Secrets para ${REPO}."
echo "Guarda esta carpeta y no la borres:"
echo "  ${SIGNING_DIR}"
echo
echo "La primera APK release puede requerir desinstalar la APK debug anterior."
echo "Después, las APK release firmadas con esta misma clave podrán actualizarse sin borrar datos."
