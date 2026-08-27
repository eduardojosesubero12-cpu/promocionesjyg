# ============================================================
#  PUBLICAR-GITHUB.PS1 — CRM Promociones JyG
#  Publica el proyecto en GitHub con un historial LIMPIO,
#  descartando los commits antiguos que contenían secretos.
#
#  Uso (PowerShell):
#     powershell -ExecutionPolicy Bypass -File .\publicar-github.ps1
# ============================================================
$ErrorActionPreference = "Stop"

$RAMA_REMOTA = "crm-for-graduation-packages-6f794"
$ORIGEN = "origin"

Write-Host ""
Write-Host "🎓 CRM Promociones JyG — Publicación en GitHub"
Write-Host "================================================"

# ---------- 1. Verificar secretos ----------
Write-Host ""
Write-Host "🔍 Paso 1/5 · Verificando que no haya secretos en el código…"
$patron = "sk-or-v1-[a-z0-9]{20,}|a1d27bff3a54da57c82e09ab6aed9ecd6d3e3901|eyJhbGciOi[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}"
$hallazgos = Get-ChildItem -Recurse -File -Exclude "*.ps1","*.sh" |
  Where-Object { $_.FullName -notmatch "node_modules|\\\.git\\|dist" } |
  Select-String -Pattern $patron -CaseSensitive:$false
if ($hallazgos) {
  Write-Host ""
  Write-Host "❌ Se encontraron posibles secretos:" -ForegroundColor Red
  $hallazgos | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" }
  Write-Host "   Elimínalos antes de publicar."
  exit 1
}
Write-Host "   ✅ Código limpio de secretos."

# ---------- 2. Repositorio Git ----------
Write-Host ""
Write-Host "📦 Paso 2/5 · Verificando repositorio Git…"
if (-not (git rev-parse --is-inside-work-tree 2>$null)) {
  Write-Host "   ⚠️  No es un repositorio Git. Inicializando…"
  git init -b master
}
$url = git remote get-url $ORIGEN 2>$null
if (-not $url) {
  Write-Host "   ❌ No hay remote '$ORIGEN'. Agrégalo con:" -ForegroundColor Red
  Write-Host "      git remote add origin https://github.com/TU-USUARIO/promocionesjyg.git"
  exit 1
}
Write-Host "   ✅ Remote: $url"

# ---------- 3. Guardar cambios ----------
Write-Host ""
Write-Host "💾 Paso 3/5 · Guardando cambios actuales…"
git add -A
$diff = git diff --cached --quiet 2>$null; $LASTEXITCODE = 0
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m "CRM Promociones JyG: código limpio de secretos" | Out-Null
  Write-Host "   ✅ Cambios guardados."
} else {
  Write-Host "   (no hay cambios sin guardar)"
}

# ---------- 4. Historial limpio ----------
Write-Host ""
Write-Host "🌿 Paso 4/5 · Creando historial limpio (rama huérfana)…"
$RAMA_LIMPIA = "historial-limpio-" + (Get-Date -Format "yyyyMMddHHmmss")
git checkout --orphan $RAMA_LIMPIA
git add -A
git commit -m "CRM Promociones JyG — paquetes de grado (historial limpio)" | Out-Null
Write-Host "   ✅ Rama '$RAMA_LIMPIA' creada con 1 solo commit."

# ---------- 5. Publicar ----------
Write-Host ""
Write-Host "🚀 Paso 5/5 · Publicando en GitHub…"
git push $ORIGEN "${RAMA_LIMPIA}:${RAMA_REMOTA}" --force
Write-Host "   ✅ Publicado en la rama remota '$RAMA_REMOTA'."

git config core.hooksPath .githooks
Write-Host ""
Write-Host "🛡️  Hook pre-commit instalado: los próximos commits se escanearán contra secretos."

Write-Host ""
Write-Host "================================================"
Write-Host "✅ ¡LISTO! Tu código ya está en GitHub sin secretos."
Write-Host ""
Write-Host "🔐 Importante: la clave antigua de OpenRouter estuvo expuesta."
Write-Host "   1) Revócala en https://openrouter.ai/keys y crea una nueva."
Write-Host "   2) Pégala en el CRM: Configuración → Motor de Escaneo Inteligente."
Write-Host "================================================"
