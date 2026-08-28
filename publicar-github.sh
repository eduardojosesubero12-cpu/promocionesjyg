#!/usr/bin/env bash
# ============================================================
#  PUBLICAR-GITHUB.SH — CRM Promociones JyG
#  Publica el proyecto en GitHub con un historial LIMPIO,
#  descartando los commits antiguos que contenían secretos.
#
#  Uso (Git Bash / terminal):
#     bash publicar-github.sh
# ============================================================
set -e

RAMA_REMOTA="crm-for-graduation-packages-6f794"
ORIGEN="origin"

echo ""
echo "🎓 CRM Promociones JyG — Publicación en GitHub"
echo "================================================"

# ---------- 1. Verificar que el código no tenga secretos ----------
echo ""
echo "🔍 Paso 1/5 · Verificando que no haya secretos en el código…"
if grep -RInE "sk-or-v1-[a-z0-9]{20,}|a1d27bff3a54da57c82e09ab6aed9ecd6d3e3901|eyJhbGciOi[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}" \
   --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist . ; then
  echo ""
  echo "❌ Se encontraron posibles secretos en los archivos de arriba."
  echo "   Elimínalos antes de publicar. (Configúralos desde Configuración en el CRM.)"
  exit 1
fi
echo "   ✅ Código limpio de secretos."

# ---------- 2. Estar dentro de un repositorio Git ----------
echo ""
echo "📦 Paso 2/5 · Verificando repositorio Git…"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "   ⚠️  Esta carpeta no es un repositorio Git. Inicializando…"
  git init -b master
fi
if ! git remote get-url "$ORIGEN" >/dev/null 2>&1; then
  echo "   ❌ No hay un remote '$ORIGEN'. Agrégalo con:"
  echo "      git remote add origin https://github.com/TU-USUARIO/promocionesjyg.git"
  exit 1
fi
echo "   ✅ Remote: $(git remote get-url "$ORIGEN")"

# ---------- 3. Guardar cambios pendientes ----------
echo ""
echo "💾 Paso 3/5 · Guardando cambios actuales…"
git add -A
if git diff --cached --quiet; then
  echo "   (no hay cambios sin guardar)"
else
  git commit -m "CRM Promociones JyG: código limpio de secretos" >/dev/null
  echo "   ✅ Cambios guardados."
fi

# ---------- 4. Crear historial nuevo (rama huérfana) ----------
echo ""
echo "🌿 Paso 4/5 · Creando historial limpio (rama huérfana)…"
RAMA_LIMPIA="historial-limpio-$(date +%Y%m%d%H%M%S)"
git checkout --orphan "$RAMA_LIMPIA"
git add -A
git commit -m "CRM Promociones JyG — paquetes de grado (historial limpio)" >/dev/null
echo "   ✅ Rama '$RAMA_LIMPIA' creada con 1 solo commit."

# ---------- 5. Publicar ----------
echo ""
echo "🚀 Paso 5/5 · Publicando en GitHub…"
git push "$ORIGEN" "$RAMA_LIMPIA:$RAMA_REMOTA" --force
echo "   ✅ Publicado en la rama remota '$RAMA_REMOTA'."

# ---------- Extra: proteger commits futuros ----------
git config core.hooksPath .githooks
echo ""
echo "🛡️  Hook pre-commit instalado: los próximos commits se escanearán contra secretos."

echo ""
echo "================================================"
echo "✅ ¡LISTO! Tu código ya está en GitHub sin secretos."
echo ""
echo "🔐 Importante: la clave antigua de OpenRouter estuvo expuesta."
echo "   1) Revócala en https://openrouter.ai/keys y crea una nueva."
echo "   2) Pégala en el CRM: Configuración → Motor de Escaneo Inteligente."
echo "================================================"
